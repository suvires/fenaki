import type { Access, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { ValidationError } from 'payload'
import { isAdminField, isAdminUser, isMemberUser } from '../access.ts'
import { changeEmailEndpoint, confirmEmailEndpoint } from '../accounts/changeEmail.ts'
import { resendVerificationEndpoint } from '../accounts/resendVerification.ts'
import { accountEmailHtml, accountEmailSubject, accountLink } from '../accounts/emails.ts'
import {
  LOCK_TIME_MS,
  MAX_LOGIN_ATTEMPTS,
  MIN_PASSWORD_LENGTH,
  SESSION_SECONDS,
} from '../accounts/rules.ts'
import { groups, inLanguage, label, messages, options } from '../labels.ts'

/** A member reads and changes only themselves; admins read everyone (support, GDPR requests). */
const itself: Access = ({ req }) =>
  isMemberUser(req.user) && req.user ? { id: { equals: req.user.id } } : false

const readMembers: Access = (args) => (isAdminUser(args.req.user) ? true : itself(args))

const checkPassword: CollectionBeforeValidateHook = ({ data, req }) => {
  if (data && typeof data.password === 'string' && data.password.length < MIN_PASSWORD_LENGTH)
    throw new ValidationError(
      {
        errors: [
          { message: inLanguage(messages.passwordTooShort, req.i18n?.language), path: 'password' },
        ],
      },
      req.t,
    )
  return data
}

/**
 * Only email, password and name come from outside. The rest is refused by field access for
 * strangers and dropped here for signed-in members.
 */
const onlyWhatTheViewerMaySet: CollectionBeforeValidateHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data
  if (typeof data.name === 'string') data.name = data.name.trim().slice(0, 80)
  // Strangers cannot set `_verified` or `sample` (field access refuses them on the REST API); a
  // signed-in member is held to the same, and cannot change their own email or verification.
  if (isMemberUser(req.user)) {
    delete data.sample
    if (operation === 'create') delete data._verified
    else {
      // Put back, not removed: the email is required, and changing it would skip the verification.
      data.email = originalDoc?.email
      data._verified = originalDoc?._verified
    }
  }
  return data
}

/**
 * Viewers: separate from `users` (the staff). They sign up and in through the site, which proxies to
 * this collection; they never reach the admin panel (`admin.user` is `users`, and `access.admin` is
 * closed here too).
 */
export const Members: CollectionConfig = {
  slug: 'members',
  labels: { singular: label('Member', 'Miembro'), plural: label('Members', 'Miembros') },
  admin: {
    useAsTitle: 'email',
    group: groups.viewers,
    defaultColumns: ['email', 'name', '_verified', 'createdAt'],
    description: label(
      'Viewers with an account. Personal data: read only, and deleted when they ask.',
      'Espectadores con cuenta. Son datos personales: solo lectura, y se borran si lo piden.',
    ),
  },
  auth: {
    tokenExpiration: SESSION_SECONDS,
    maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
    lockTime: LOCK_TIME_MS,
    verify: {
      generateEmailHTML: ({ token }) =>
        accountEmailHtml('verify', accountLink('verify', String(token))),
      generateEmailSubject: () => accountEmailSubject('verify'),
    },
    forgotPassword: {
      generateEmailHTML: (args) =>
        accountEmailHtml('reset', accountLink('reset', String(args?.token))),
      generateEmailSubject: () => accountEmailSubject('reset'),
    },
  },
  endpoints: [resendVerificationEndpoint, changeEmailEndpoint, confirmEmailEndpoint],
  access: {
    admin: () => false,
    read: readMembers,
    // Sign-up is public. Field access and the hooks below limit what it can set.
    create: () => true,
    update: itself,
    // A member deletes their own account; an admin can delete one on request.
    delete: (args) => (isAdminUser(args.req.user) ? true : itself(args)),
  },
  hooks: {
    beforeValidate: [onlyWhatTheViewerMaySet, checkPassword],
    // The account's data goes with it: list, ratings and viewings (a GDPR erasure leaves nothing).
    // Before the account itself: their rows point at it.
    beforeDelete: [
      async ({ id, req }) => {
        for (const collection of ['list-items', 'ratings', 'viewings'] as const)
          await req.payload.delete({
            collection,
            where: { member: { equals: id } },
            overrideAccess: true,
            req,
          })
      },
    ],
  },
  fields: [
    {
      name: 'name',
      label: label('Name', 'Nombre'),
      type: 'text',
      maxLength: 80,
    },
    {
      name: 'sample',
      label: label('Sample data', 'Datos de ejemplo'),
      type: 'checkbox',
      defaultValue: false,
      access: { create: isAdminField, update: isAdminField },
      admin: {
        position: 'sidebar',
        description: label(
          'Sample account for development, not a real viewer.',
          'Cuenta de ejemplo para desarrollo, no es un espectador real.',
        ),
      },
    },
    {
      name: 'pendingEmail',
      label: label('New email, waiting for confirmation', 'Email nuevo, pendiente de confirmar'),
      type: 'email',
      // Only the change-email endpoints write these, with overrideAccess.
      access: { create: () => false, update: () => false },
      admin: {
        readOnly: true,
        description: label(
          'The member asked to change their email; it changes once they open the link sent there.',
          'El miembro pidió cambiar su email; cambia cuando abra el enlace enviado a esa dirección.',
        ),
      },
    },
    {
      name: 'pendingEmailToken',
      type: 'text',
      index: true,
      access: { read: () => false, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'pendingEmailExpiresAt',
      type: 'date',
      access: { create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'playerConsent',
      label: label('Players allowed without asking', 'Reproductores permitidos sin preguntar'),
      type: 'select',
      hasMany: true,
      options: options({
        youtube: label('YouTube', 'YouTube'),
        vimeo: label('Vimeo', 'Vimeo'),
      }),
      admin: {
        description: label(
          'The member chose to load these players without the consent dialog, on every device. They change it at «Preferencias de reproducción».',
          'El miembro eligió cargar estos reproductores sin la ventana de consentimiento, en todos sus dispositivos. Lo cambia en «Preferencias de reproducción».',
        ),
      },
    },
  ],
}
