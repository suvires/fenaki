/* @ds-bundle: {"format":4,"namespace":"Shortix","components":[{"name":"Button"},{"name":"Badge"},{"name":"Duration"},{"name":"Poster"},{"name":"ShortCard"},{"name":"Rail"},{"name":"FilterChips"},{"name":"SearchField"},{"name":"SponsorCredit"},{"name":"CollectionHero"},{"name":"LicenseNote"},{"name":"PlayerGate"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(" ");
  }

  var ICONS = {
    play: "M8 5.5v13l11-6.5z",
    plus: "M12 5v14M5 12h14",
    search: "M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM15.5 15.5 20 20",
    arrow: "M5 12h14M13 6l6 6-6 6"
  };

  function Icon(props) {
    var filled = props.name === "play";
    return h("svg", {
      className: cx("sx-icon", props.className),
      viewBox: "0 0 24 24",
      width: props.size || 20,
      height: props.size || 20,
      "aria-hidden": "true",
      fill: filled ? "currentColor" : "none",
      stroke: filled ? "none" : "currentColor",
      strokeWidth: 1.75,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, h("path", { d: ICONS[props.name] }));
  }

  function Button(props) {
    var variant = props.variant || "primary";
    var size = props.size || "md";
    var rest = Object.assign({}, props);
    ["variant", "size", "icon", "children", "className", "href"].forEach(function (k) { delete rest[k]; });
    var tag = props.href ? "a" : "button";
    if (!props.href && !rest.type) rest.type = "button";
    if (props.href) rest.href = props.href;
    return h(tag, Object.assign(rest, {
      className: cx("sx-btn", "sx-btn-" + variant, "sx-btn-" + size, props.className)
    }), props.icon ? h(Icon, { name: props.icon, size: size === "lg" ? 22 : 18 }) : null, h("span", null, props.children));
  }

  function Badge(props) {
    return h("span", { className: cx("sx-badge", "sx-badge-" + (props.tone || "neutral"), props.className) }, props.children);
  }

  function formatMinutes(seconds, locale) {
    var minutes = Math.max(1, Math.round((seconds || 0) / 60));
    try {
      return new Intl.NumberFormat(locale || "es", { style: "unit", unit: "minute", unitDisplay: "short" }).format(minutes);
    } catch (e) {
      return minutes + " min";
    }
  }

  function Duration(props) {
    return h("span", { className: cx("sx-time", props.className) }, formatMinutes(props.seconds, props.locale));
  }

  function Poster(props) {
    return h("div", {
      className: cx("sx-poster", "sx-poster-" + (props.tone || "sala"), props.className),
      role: "img",
      "aria-label": props.title + (props.director ? ", " + props.director : "")
    },
      h("span", { className: "sx-poster-perf", "aria-hidden": "true" }),
      h("span", { className: "sx-poster-title" }, props.title),
      props.director ? h("span", { className: "sx-poster-credit" }, props.director) : null,
      props.year ? h("span", { className: "sx-poster-year" }, props.year) : null
    );
  }

  function ShortCard(props) {
    var body = [
      h(Poster, { key: "p", title: props.title, director: props.director, year: props.year, tone: props.tone }),
      h("span", { key: "m", className: "sx-card-meta" },
        h("span", { className: "sx-card-title" }, props.title),
        h("span", { className: "sx-card-line" },
          props.seconds ? h(Duration, { seconds: props.seconds, locale: props.locale }) : null,
          props.director ? h("span", null, props.director) : null
        ),
        props.badges && props.badges.length ? h("span", { className: "sx-card-badges" }, props.badges.map(function (b, i) {
          return h(Badge, { key: i, tone: b.tone }, b.label);
        })) : null
      )
    ];
    return h(props.href ? "a" : "div", { className: cx("sx-card", props.className), href: props.href }, body);
  }

  function Rail(props) {
    return h("section", { className: cx("sx-rail", props.className), "aria-label": props.title },
      h("header", { className: "sx-rail-head" },
        h("h2", { className: "sx-rail-title" }, props.title),
        props.actionLabel ? h("a", { className: "sx-rail-action", href: props.actionHref || "#" }, props.actionLabel, h(Icon, { name: "arrow", size: 16 })) : null
      ),
      h("div", { className: "sx-rail-track" }, props.children)
    );
  }

  function FilterChips(props) {
    var state = React.useState(props.defaultValue || null);
    var value = props.value !== undefined ? props.value : state[0];
    function pick(v) {
      var next = v === value ? null : v;
      if (props.value === undefined) state[1](next);
      if (props.onChange) props.onChange(next);
    }
    return h("div", { className: cx("sx-chips", props.className), role: "group", "aria-label": props.label },
      props.options.map(function (o) {
        var on = o.value === value;
        return h("button", { key: o.value, type: "button", className: cx("sx-chip", on && "sx-chip-on"), "aria-pressed": on, onClick: function () { pick(o.value); } }, o.label);
      })
    );
  }

  function SearchField(props) {
    var id = props.id || "sx-search";
    return h("div", { className: cx("sx-search", props.className) },
      h("label", { className: "sx-visually-hidden", htmlFor: id }, props.label),
      h(Icon, { name: "search", size: 20 }),
      h("input", { id: id, type: "search", placeholder: props.placeholder, defaultValue: props.defaultValue })
    );
  }

  function SponsorCredit(props) {
    return h("p", { className: cx("sx-sponsor", props.className) },
      h("span", { className: "sx-sponsor-label" }, props.label),
      h("span", { className: "sx-sponsor-name" }, props.name)
    );
  }

  function CollectionHero(props) {
    return h("section", { className: cx("sx-hero", props.sponsor ? "sx-hero-sponsored" : null, props.className) },
      h("div", { className: "sx-hero-copy" },
        h("p", { className: "sx-hero-eyebrow" }, props.eyebrow),
        h("h1", { className: "sx-hero-title" }, props.title),
        h("p", { className: "sx-hero-text" }, props.description),
        h("div", { className: "sx-hero-actions" },
          h(Button, { variant: "primary", size: "lg", icon: "play", href: props.ctaHref }, props.ctaLabel),
          props.secondaryLabel ? h(Button, { variant: "secondary", size: "lg", icon: "plus" }, props.secondaryLabel) : null
        ),
        props.sponsor ? h(SponsorCredit, { label: props.sponsor.label, name: props.sponsor.name }) : null
      ),
      h("div", { className: "sx-hero-stack", "aria-hidden": "true" }, (props.posters || []).slice(0, 3).map(function (p, i) {
        return h(Poster, { key: i, title: p.title, director: p.director, year: p.year, tone: p.tone });
      }))
    );
  }

  function LicenseNote(props) {
    return h("aside", { className: cx("sx-license", "sx-license-" + (props.route || "embed"), props.className) },
      h("span", { className: "sx-license-route" }, props.routeLabel),
      h("p", { className: "sx-license-text" }, props.children)
    );
  }

  function PlayerGate(props) {
    var state = React.useState(false);
    return h("div", { className: cx("sx-player", props.className) },
      state[0]
        ? h("div", { className: "sx-player-live", role: "status" }, props.loadedLabel)
        : h("div", { className: "sx-player-gate" },
            h("p", { className: "sx-player-title" }, props.title),
            h("p", { className: "sx-player-msg" }, props.message),
            h("div", { className: "sx-player-actions" },
              h(Button, { variant: "primary", size: "lg", icon: "play", onClick: function () { state[1](true); } }, props.playLabel),
              props.moreLabel ? h(Button, { variant: "ghost", href: props.moreHref || "#" }, props.moreLabel) : null
            )
          )
    );
  }

  window.Shortix = Object.assign(window.Shortix || {}, {
    Button: Button, Badge: Badge, Duration: Duration, Poster: Poster, ShortCard: ShortCard, Rail: Rail,
    FilterChips: FilterChips, SearchField: SearchField, SponsorCredit: SponsorCredit,
    CollectionHero: CollectionHero, LicenseNote: LicenseNote, PlayerGate: PlayerGate, Icon: Icon
  });
})();
