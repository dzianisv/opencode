import { q as createSignal, N as onMount, v as getNextElement, w as getNextMarker, z as insert, i as createComponent, l as createRenderEffect, a0 as template, r as delegateEvents, T as Title, M as Meta, L as Link, S as Show, Q as setAttribute, k as createMemo, K as onCleanup, D as memo, j as createEffect, d as addEventListener, O as runHydrationEvents, F as For, a2 as use, W as setStyleProperty, $ as style } from "./routing--lmSOy1r.js";
import { c as createAsync, b as createServerReference, q as query, h as getModelCatalog, g as getGitHubStars, t as themeStorageKey, a as applyThemePreference, j as isThemePreference, i as githubLink, H as Header, F as Footer, f as findModelCatalogEntry } from "./stats-shell-CsMXs3yn.js";
import { a as countryCodesSource, c as countriesTopologySource, f as feature, g as geoEquirectangular, b as geoPath, m as mesh, P as ProviderIcon, s as sqrt } from "./countries-50m-AdHQYOKv.js";
const ibmPlexMonoRegularLatin1 = "/data/_build/assets/IBMPlexMono-Regular-Latin1-BsnL3gsb.woff2";
const ibmPlexMonoMediumLatin1 = "/data/_build/assets/IBMPlexMono-Medium-Latin1-DBHUbp12.woff2";
const ibmPlexMonoSemiBoldLatin1 = "/data/_build/assets/IBMPlexMono-SemiBold-Latin1-iYs1QkgK.woff2";
const ibmPlexMonoBoldLatin1 = "/data/_build/assets/IBMPlexMono-Bold-Latin1-K_Zucu9w.woff2";
var _tmpl$ = /* @__PURE__ */ template(`<main data-page=stats><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><div data-component=container><div data-component=content></div><!$><!/>`), _tmpl$2 = /* @__PURE__ */ template(`<section data-section=hero><p data-slot=hero-meta aria-live=polite aria-atomic=true><svg aria-hidden=true width=16 height=16 viewBox="0 0 16 16"><path fill-rule=evenodd clip-rule=evenodd d="M13 13H3V3H13V13ZM6.46777 6.81641V7.81641H7.5791V11.3721H8.5791V6.81641H6.46777ZM7.30078 4.62891V5.62891H8.85645V4.62891H7.30078Z"fill=currentColor></path></svg><!$><!/></p><div data-slot=hero-canvas><div data-slot=hero-pattern aria-hidden=true></div><h1>Model Data</h1><p data-slot=hero-copy>See which models are winning real usage, how the mix <br data-slot=hero-copy-break>shifts over time, and where momentum is moving each week.`), _tmpl$3 = /* @__PURE__ */ template(`<span data-slot=hero-meta-label aria-hidden=true>Updated`), _tmpl$4 = /* @__PURE__ */ template(`<span data-slot=hero-meta-time aria-hidden=true><!$><!/><span data-slot=hero-meta-separator>,</span><!$><!/>`), _tmpl$5 = /* @__PURE__ */ template(`<span data-slot=hero-meta-empty>No rows yet`), _tmpl$6 = /* @__PURE__ */ template(`<span data-slot=hero-meta-ticker><span data-slot=hero-meta-ticker-track><span data-slot=hero-meta-ticker-item></span><span data-slot=hero-meta-ticker-item>`), _tmpl$7 = /* @__PURE__ */ template(`<section data-section=chart><div data-slot=section-header><div><h2></h2><!$><!/></div><!$><!/></div><!$><!/>`), _tmpl$8 = /* @__PURE__ */ template(`<p>`), _tmpl$9 = /* @__PURE__ */ template(`<p data-slot=section-title><strong><!$><!/>.</strong> <span>`), _tmpl$0 = /* @__PURE__ */ template(`<a data-component=section-bridge><span>LEAN MORE</span><i></i><strong></strong><b>▸`), _tmpl$1 = /* @__PURE__ */ template(`<div data-component=empty-state><strong></strong><p>`), _tmpl$10 = /* @__PURE__ */ template(`<section id=top-models data-section=top-models><h2 data-slot=top-models-title><strong>Top models.</strong> <span>Usage of models across OpenCode Go.</span></h2><!$><!/><!$><!/><div data-slot=chart-footer hidden><!$><!/><div data-slot=top-models-mobile-controls><!$><!/><!$><!/></div></div><!$><!/>`), _tmpl$11 = /* @__PURE__ */ template(`<button data-slot=mobile-filter-button type=button><span></span><!$><!/>`), _tmpl$12 = /* @__PURE__ */ template(`<div data-component=mobile-filter-sheet role=presentation><div data-slot=filter-sheet-panel role=radiogroup>`), _tmpl$13 = /* @__PURE__ */ template(`<button type=button role=radio>`), _tmpl$14 = /* @__PURE__ */ template(`<svg width=16 height=16 viewBox="0 0 16 16"aria-hidden=true fill=none><path d="M5 7L8 10L11 7"stroke=currentColor>`), _tmpl$15 = /* @__PURE__ */ template(`<div data-component=usage-filter role=radiogroup>`), _tmpl$16 = /* @__PURE__ */ template(`<div data-component=top-models-chart role=img aria-label="Stacked top model usage chart"><div data-slot=top-models-axis aria-hidden=true></div><div data-slot=top-models-bars>`), _tmpl$17 = /* @__PURE__ */ template(`<div><span data-slot=axis-label><span data-slot=axis-total></span><span data-slot=axis-date><span data-slot=axis-date-full></span><span data-slot=axis-date-mobile>`), _tmpl$18 = /* @__PURE__ */ template(`<div data-slot=top-models-bar role=button tabindex=0><div data-slot=top-models-stack></div><!$><!/>`), _tmpl$19 = /* @__PURE__ */ template(`<i>`), _tmpl$20 = /* @__PURE__ */ template(`<div data-component=chart-tooltip><strong></strong><span><!$><!/> total</span><div data-slot=tooltip-divider></div><!$><!/>`), _tmpl$21 = /* @__PURE__ */ template(`<p><span data-slot=tooltip-label><i></i> <!$><!/></span><b>`), _tmpl$22 = /* @__PURE__ */ template(`<div id=leaderboard data-component=leaderboard role=list aria-label="Model token leaderboard"><div data-slot=leaderboard-featured></div><div data-slot=leaderboard-pattern aria-hidden=true></div><div data-slot=leaderboard-compact></div><div data-slot=leaderboard-mobile aria-label="Scrollable model token leaderboard">`), _tmpl$23 = /* @__PURE__ */ template(`<a data-component=leader-card role=listitem tabindex=0><span data-slot=rank></span><!$><!/><div data-slot=leader-body><!$><!/><div data-slot=leader-copy><div><strong></strong><span></span></div><div><span></span><span data-slot=delta>`), _tmpl$24 = /* @__PURE__ */ template(`<section id=market-share data-section=market-share><!$><!/><!$><!/><!$><!/><div data-slot=market-footer><p><span>[*]</span><strong></strong></p><div hidden>`), _tmpl$25 = /* @__PURE__ */ template(`<div data-component=market-share role=img aria-label="Market share by model author"><div data-slot=market-labels></div><div data-slot=market-bars>`), _tmpl$26 = /* @__PURE__ */ template(`<button type=button><span data-slot=market-axis-label><span data-slot=market-total></span><span data-slot=market-date><span data-slot=market-date-full></span><span data-slot=market-date-mobile>`), _tmpl$27 = /* @__PURE__ */ template(`<button type=button>`), _tmpl$28 = /* @__PURE__ */ template(`<span>`), _tmpl$29 = /* @__PURE__ */ template(`<ol data-component=market-share-list>`), _tmpl$30 = /* @__PURE__ */ template(`<li role=button tabindex=0><span></span><i></i><strong></strong><em></em><b><!$><!/>%`), _tmpl$31 = /* @__PURE__ */ template(`<div data-component=geo-breakdown><div data-slot=geo-map-panel><!$><!/><!$><!/></div><!$><!/>`), _tmpl$32 = /* @__PURE__ */ template(`<section id=geo-breakdown data-section=geo-breakdown><!$><!/><!$><!/><!$><!/>`), _tmpl$33 = /* @__PURE__ */ template(`<div data-slot=geo-active-country><span>#<!$><!/></span><strong></strong><p><b></b><em>`), _tmpl$34 = /* @__PURE__ */ template(`<svg data-component=geo-world-map viewBox="0 0 960 430"role=img aria-label="World map of token usage by country"><title>Geo Breakdown map</title><g data-slot=geo-countries></g><g data-slot=geo-country-markers></g><path data-slot=geo-borders aria-hidden=true>`), _tmpl$35 = /* @__PURE__ */ template(`<svg><path aria-hidden=true></svg>`, false, true, false), _tmpl$36 = /* @__PURE__ */ template(`<svg><circle aria-hidden=true></svg>`, false, true, false), _tmpl$37 = /* @__PURE__ */ template(`<ol data-component=geo-country-list>`), _tmpl$38 = /* @__PURE__ */ template(`<li><button type=button><span></span><i></i><strong></strong><em></em><b>`), _tmpl$39 = /* @__PURE__ */ template(`<section id=token-cost data-section=token-cost><!$><!/><!$><!/><!$><!/><div data-slot=token-footer hidden><!$><!/><!$><!/>`), _tmpl$40 = /* @__PURE__ */ template(`<div data-component=token-cost><!$><!/><!$><!/>`), _tmpl$41 = /* @__PURE__ */ template(`<button type=button data-component=token-row><strong></strong><span></span><!$><!/>`), _tmpl$42 = /* @__PURE__ */ template(`<div data-component=token-tooltip><p><span>Input</span><strong></strong></p><p><span>Output</span><strong></strong></p><p><span>Cached</span><strong>`), _tmpl$43 = /* @__PURE__ */ template(`<section id=cache-ratio data-section=cache-ratio><!$><!/><!$><!/><!$><!/><div data-slot=token-footer hidden><!$><!/><!$><!/>`), _tmpl$44 = /* @__PURE__ */ template(`<div data-component=cache-ratio data-variant=marker><div data-slot=cache-ratio-heading aria-hidden=true><strong>Ratio</strong><span>Model</span><b>0-100%</b></div><div data-slot=cache-ratio-rows></div><!$><!/>`), _tmpl$45 = /* @__PURE__ */ template(`<button type=button data-component=cache-ratio-row><strong></strong><span></span><!$><!/>`), _tmpl$46 = /* @__PURE__ */ template(`<div data-component=token-tooltip data-variant=cache-ratio><p><span>Cache Ratio</span><strong></strong></p><p><span>Cached</span><strong></strong></p><p><span>Uncached</span><strong>`), _tmpl$47 = /* @__PURE__ */ template(`<i data-component=cache-ratio-marker><em>`), _tmpl$48 = /* @__PURE__ */ template(`<i data-component=metric-bar><b></b><em>`), _tmpl$49 = /* @__PURE__ */ template(`<section id=session-cost data-section=session-cost><!$><!/><!$><!/><!$><!/><div data-slot=token-footer hidden><!$><!/><!$><!/>`), _tmpl$50 = /* @__PURE__ */ template(`<div data-component=session-cost><div data-slot=session-heading><strong aria-hidden=true></strong><span aria-hidden=true></span><p>COST / SESSION</p><p>TOKENS / SESSION</p></div><!$><!/><!$><!/>`), _tmpl$51 = /* @__PURE__ */ template(`<button type=button data-component=token-row data-variant=session><strong></strong><span></span><!$><!/><!$><!/>`), _tmpl$52 = /* @__PURE__ */ template(`<div data-component=token-tooltip data-variant=session><p><span>Cost/Session</span><strong></strong></p><p><span>Tokens/Session</span><strong>`), _tmpl$53 = /* @__PURE__ */ template(`<span data-component=live-filter>Live`);
const products = ["All Users", "Zen", "Go"];
const tokenProducts = ["Zen", "Go"];
const ranges = ["1D", "1W", "2W", "1M", "2M"];
const rangeLabels = {
  "1D": "1 Day",
  "1W": "1 Week",
  "2W": "2 Weeks",
  "1M": "1 Month",
  "2M": "2 Months"
};
const statsHomeTitle = "OpenCode Data";
const statsHomeDescription = "OpenCode usage data, market share, token cost, and session cost.";
const statsHomeFallbackUrl = "https://opencode.ai/data/";
const statsUnfurlPath = "banner.jpg";
const statsUnfurlAlt = "OpenCode Data wordmark on a dark patterned background";
const usageColors = ["#ed6aff", "#a684ff", "#7c86ff", "#51a2ff", "#00d3f2", "#00d5be", "#00bc7d", "#9ae600", "#ffb900", "#ff8904", "#ff6467"];
const marketColors = ["#ed6aff", "#a684ff", "#7c86ff", "#51a2ff", "#00d3f2", "#00d5be", "#00bc7d", "#9ae600", "#ffb900"];
const geoMapWidth = 960;
const geoMapHeight = 430;
const countryDisplayNames = new Intl.DisplayNames(["en"], {
  type: "region"
});
const countryNumericIds = new Map(JSON.parse(countryCodesSource).map((country) => [country[0], country[2]]));
const worldTopology = JSON.parse(countriesTopologySource);
const worldCountryGeometries = {
  ...worldTopology.objects.countries,
  geometries: worldTopology.objects.countries.geometries.filter((country) => String(country.id ?? "") !== "010")
};
const worldCountries = feature(worldTopology, worldCountryGeometries);
const worldProjection = geoEquirectangular().fitExtent([[10, 12], [geoMapWidth - 10, geoMapHeight - 12]], worldCountries);
const worldPath = geoPath(worldProjection);
const worldCountryPaths = worldCountries.features.map((country) => ({
  id: String(country.id ?? "").padStart(3, "0"),
  path: worldPath(country) ?? "",
  marker: geoCountryMarker(country)
}));
const worldBorderPath = worldPath(mesh(worldTopology, worldCountryGeometries, (a, b) => a !== b)) ?? "";
const getData_query = createServerReference("af22240409e3c36f74894bfdbbd26e6e1163aaa06eba7bec0be1f00a4352fa25");
const getData = query(getData_query, "getStatsHomeData");
function StatsHome() {
  const statsHomeUrl = getStatsHomeUrl("/data/", typeof window === "undefined" ? statsHomeFallbackUrl : window.location.href);
  const statsUnfurlUrl = new URL(statsUnfurlPath, statsHomeUrl).toString();
  const data = createAsync(() => getData());
  const catalog = createAsync(() => getModelCatalog());
  const githubStars = createAsync(() => getGitHubStars());
  const [themePreference, setThemePreference] = createSignal("system");
  const updateThemePreference = (preference) => {
    applyThemePreference(preference);
    setThemePreference(preference);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(themeStorageKey, preference);
  };
  onMount(() => {
    if (typeof window === "undefined") return;
    const preference = window.localStorage.getItem(themeStorageKey);
    const nextPreference = isThemePreference(preference) ? preference : "system";
    applyThemePreference(nextPreference);
    setThemePreference(nextPreference);
  });
  return (() => {
    var _el$ = getNextElement(_tmpl$), _el$6 = _el$.firstChild, [_el$7, _co$2] = getNextMarker(_el$6.nextSibling), _el$8 = _el$7.nextSibling, [_el$9, _co$3] = getNextMarker(_el$8.nextSibling), _el$0 = _el$9.nextSibling, [_el$1, _co$4] = getNextMarker(_el$0.nextSibling), _el$10 = _el$1.nextSibling, [_el$11, _co$5] = getNextMarker(_el$10.nextSibling), _el$12 = _el$11.nextSibling, [_el$13, _co$6] = getNextMarker(_el$12.nextSibling), _el$14 = _el$13.nextSibling, [_el$15, _co$7] = getNextMarker(_el$14.nextSibling), _el$16 = _el$15.nextSibling, [_el$17, _co$8] = getNextMarker(_el$16.nextSibling), _el$18 = _el$17.nextSibling, [_el$19, _co$9] = getNextMarker(_el$18.nextSibling), _el$20 = _el$19.nextSibling, [_el$21, _co$0] = getNextMarker(_el$20.nextSibling), _el$22 = _el$21.nextSibling, [_el$23, _co$1] = getNextMarker(_el$22.nextSibling), _el$24 = _el$23.nextSibling, [_el$25, _co$10] = getNextMarker(_el$24.nextSibling), _el$26 = _el$25.nextSibling, [_el$27, _co$11] = getNextMarker(_el$26.nextSibling), _el$28 = _el$27.nextSibling, [_el$29, _co$12] = getNextMarker(_el$28.nextSibling), _el$30 = _el$29.nextSibling, [_el$31, _co$13] = getNextMarker(_el$30.nextSibling), _el$32 = _el$31.nextSibling, [_el$33, _co$14] = getNextMarker(_el$32.nextSibling), _el$34 = _el$33.nextSibling, [_el$35, _co$15] = getNextMarker(_el$34.nextSibling), _el$36 = _el$35.nextSibling, [_el$37, _co$16] = getNextMarker(_el$36.nextSibling), _el$38 = _el$37.nextSibling, [_el$39, _co$17] = getNextMarker(_el$38.nextSibling), _el$40 = _el$39.nextSibling, [_el$41, _co$18] = getNextMarker(_el$40.nextSibling), _el$42 = _el$41.nextSibling, [_el$43, _co$19] = getNextMarker(_el$42.nextSibling), _el$44 = _el$43.nextSibling, [_el$45, _co$20] = getNextMarker(_el$44.nextSibling), _el$46 = _el$45.nextSibling, [_el$47, _co$21] = getNextMarker(_el$46.nextSibling), _el$48 = _el$47.nextSibling, [_el$49, _co$22] = getNextMarker(_el$48.nextSibling), _el$2 = _el$49.nextSibling, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, [_el$5, _co$] = getNextMarker(_el$4.nextSibling);
    insert(_el$, createComponent(Title, {
      children: statsHomeTitle
    }), _el$7, _co$2);
    insert(_el$, createComponent(Meta, {
      name: "description",
      content: statsHomeDescription
    }), _el$9, _co$3);
    insert(_el$, createComponent(Link, {
      rel: "canonical",
      href: statsHomeUrl
    }), _el$1, _co$4);
    insert(_el$, createComponent(Meta, {
      property: "og:type",
      content: "website"
    }), _el$11, _co$5);
    insert(_el$, createComponent(Meta, {
      property: "og:site_name",
      content: "OpenCode"
    }), _el$13, _co$6);
    insert(_el$, createComponent(Meta, {
      property: "og:title",
      content: statsHomeTitle
    }), _el$15, _co$7);
    insert(_el$, createComponent(Meta, {
      property: "og:description",
      content: statsHomeDescription
    }), _el$17, _co$8);
    insert(_el$, createComponent(Meta, {
      property: "og:url",
      content: statsHomeUrl
    }), _el$19, _co$9);
    insert(_el$, createComponent(Meta, {
      property: "og:image",
      content: statsUnfurlUrl
    }), _el$21, _co$0);
    insert(_el$, createComponent(Meta, {
      property: "og:image:type",
      content: "image/jpeg"
    }), _el$23, _co$1);
    insert(_el$, createComponent(Meta, {
      property: "og:image:width",
      content: "1200"
    }), _el$25, _co$10);
    insert(_el$, createComponent(Meta, {
      property: "og:image:height",
      content: "630"
    }), _el$27, _co$11);
    insert(_el$, createComponent(Meta, {
      property: "og:image:alt",
      content: statsUnfurlAlt
    }), _el$29, _co$12);
    insert(_el$, createComponent(Meta, {
      name: "twitter:card",
      content: "summary_large_image"
    }), _el$31, _co$13);
    insert(_el$, createComponent(Meta, {
      name: "twitter:title",
      content: statsHomeTitle
    }), _el$33, _co$14);
    insert(_el$, createComponent(Meta, {
      name: "twitter:description",
      content: statsHomeDescription
    }), _el$35, _co$15);
    insert(_el$, createComponent(Meta, {
      name: "twitter:image",
      content: statsUnfurlUrl
    }), _el$37, _co$16);
    insert(_el$, createComponent(Meta, {
      name: "twitter:image:alt",
      content: statsUnfurlAlt
    }), _el$39, _co$17);
    insert(_el$, createComponent(Link, {
      rel: "preload",
      href: ibmPlexMonoRegularLatin1,
      as: "font",
      type: "font/woff2",
      crossorigin: "anonymous"
    }), _el$41, _co$18);
    insert(_el$, createComponent(Link, {
      rel: "preload",
      href: ibmPlexMonoMediumLatin1,
      as: "font",
      type: "font/woff2",
      crossorigin: "anonymous"
    }), _el$43, _co$19);
    insert(_el$, createComponent(Link, {
      rel: "preload",
      href: ibmPlexMonoSemiBoldLatin1,
      as: "font",
      type: "font/woff2",
      crossorigin: "anonymous"
    }), _el$45, _co$20);
    insert(_el$, createComponent(Link, {
      rel: "preload",
      href: ibmPlexMonoBoldLatin1,
      as: "font",
      type: "font/woff2",
      crossorigin: "anonymous"
    }), _el$47, _co$21);
    insert(_el$, createComponent(Header, {
      get githubStars() {
        return githubStars() ?? githubLink.fallbackStars;
      }
    }), _el$49, _co$22);
    insert(_el$3, createComponent(Show, {
      get when() {
        return data();
      },
      get fallback() {
        return createComponent(StatsLoading, {});
      },
      children: (stats) => [createComponent(Hero, {
        get updatedAt() {
          return stats().updatedAt;
        }
      }), createComponent(TopModelsSection, {
        get data() {
          return stats().usage;
        },
        get leaderboard() {
          return stats().leaderboard;
        }
      }), createComponent(SessionCostSection, {
        get data() {
          return stats().sessionCost;
        }
      }), createComponent(TokenCostSection, {
        get data() {
          return stats().tokenCost;
        },
        get catalog() {
          return catalog() ?? null;
        }
      }), createComponent(CacheRatioSection, {
        get data() {
          return stats().cacheRatio;
        }
      }), createComponent(MarketShareSection, {
        get data() {
          return stats().market;
        }
      }), createComponent(GeoBreakdownSection, {
        get data() {
          return stats().country;
        }
      })]
    }));
    insert(_el$2, createComponent(Footer, {
      get themePreference() {
        return themePreference();
      },
      onThemePreferenceChange: updateThemePreference
    }), _el$5, _co$);
    createRenderEffect(() => setAttribute(_el$, "data-theme", themePreference()));
    return _el$;
  })();
}
function getStatsHomeUrl(base, requestUrl) {
  const url = new URL(base, requestUrl);
  if (url.hostname === "stats.opencode.ai") return "https://opencode.ai/data/";
  if (url.hostname === "stats.dev.opencode.ai") return "https://dev.opencode.ai/data/";
  return url.toString();
}
function Hero(props) {
  const [timeZone, setTimeZone] = createSignal("UTC");
  const [previousTimeZone, setPreviousTimeZone] = createSignal("UTC");
  const [isTicking, setIsTicking] = createSignal(false);
  const updatedAtParts = (timeZone2) => props.updatedAt ? formatUpdatedAtParts(props.updatedAt, timeZone2) : {
    date: "No rows yet",
    time: ""
  };
  const previousUpdatedAt = createMemo(() => updatedAtParts(previousTimeZone()));
  const currentUpdatedAt = createMemo(() => updatedAtParts(timeZone()));
  const currentUpdatedLabel = createMemo(() => props.updatedAt ? `Updated ${formatUpdatedAtLabel(currentUpdatedAt())}` : "No rows yet");
  const isDateTicking = createMemo(() => isTicking() && previousUpdatedAt().date !== currentUpdatedAt().date);
  const isTimeTicking = createMemo(() => isTicking() && previousUpdatedAt().time !== currentUpdatedAt().time);
  onMount(() => {
    if (!props.updatedAt) return;
    const nextTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (nextTimeZone === "UTC") return;
    if (formatUpdatedAtLabel(formatUpdatedAtParts(props.updatedAt, nextTimeZone)) === formatUpdatedAtLabel(updatedAtParts("UTC"))) return;
    const timeouts = [];
    timeouts.push(window.setTimeout(() => {
      setPreviousTimeZone(timeZone());
      setTimeZone(nextTimeZone);
      setIsTicking(true);
      timeouts.push(window.setTimeout(() => {
        setPreviousTimeZone(nextTimeZone);
        setIsTicking(false);
      }, 720));
    }, 480));
    onCleanup(() => timeouts.forEach((timeout) => window.clearTimeout(timeout)));
  });
  return (() => {
    var _el$50 = getNextElement(_tmpl$2), _el$51 = _el$50.firstChild, _el$52 = _el$51.firstChild, _el$53 = _el$52.nextSibling, [_el$54, _co$23] = getNextMarker(_el$53.nextSibling);
    insert(_el$51, (() => {
      var _c$ = memo(() => !!props.updatedAt);
      return () => _c$() ? [getNextElement(_tmpl$3), (() => {
        var _el$56 = getNextElement(_tmpl$4), _el$58 = _el$56.firstChild, [_el$59, _co$24] = getNextMarker(_el$58.nextSibling), _el$57 = _el$59.nextSibling, _el$60 = _el$57.nextSibling, [_el$61, _co$25] = getNextMarker(_el$60.nextSibling);
        insert(_el$56, createComponent(HeroMetaTickerPart, {
          get previous() {
            return previousUpdatedAt().date;
          },
          get current() {
            return currentUpdatedAt().date;
          },
          get ticking() {
            return isDateTicking();
          }
        }), _el$59, _co$24);
        insert(_el$56, createComponent(HeroMetaTickerPart, {
          get previous() {
            return previousUpdatedAt().time;
          },
          get current() {
            return currentUpdatedAt().time;
          },
          get ticking() {
            return isTimeTicking();
          }
        }), _el$61, _co$25);
        return _el$56;
      })()] : getNextElement(_tmpl$5);
    })(), _el$54, _co$23);
    createRenderEffect(() => setAttribute(_el$51, "aria-label", currentUpdatedLabel()));
    return _el$50;
  })();
}
function HeroMetaTickerPart(props) {
  return (() => {
    var _el$63 = getNextElement(_tmpl$6), _el$64 = _el$63.firstChild, _el$65 = _el$64.firstChild, _el$66 = _el$65.nextSibling;
    insert(_el$65, () => props.previous);
    insert(_el$66, () => props.current);
    createRenderEffect(() => setAttribute(_el$63, "data-ticking", props.ticking));
    return _el$63;
  })();
}
function StatsLoading() {
  return [createComponent(Hero, {
    updatedAt: null
  }), createComponent(ChartSection, {
    title: "Usage",
    get children() {
      return createComponent(EmptyState, {
        title: "Loading data",
        description: "Reading model aggregates from model_stat."
      });
    }
  })];
}
function ChartSection(props) {
  return (() => {
    var _el$67 = getNextElement(_tmpl$7), _el$68 = _el$67.firstChild, _el$69 = _el$68.firstChild, _el$70 = _el$69.firstChild, _el$71 = _el$70.nextSibling, [_el$72, _co$26] = getNextMarker(_el$71.nextSibling), _el$73 = _el$69.nextSibling, [_el$74, _co$27] = getNextMarker(_el$73.nextSibling), _el$75 = _el$68.nextSibling, [_el$76, _co$28] = getNextMarker(_el$75.nextSibling);
    insert(_el$70, () => props.title);
    insert(_el$69, (() => {
      var _c$2 = memo(() => !!props.description);
      return () => _c$2() && (() => {
        var _el$77 = getNextElement(_tmpl$8);
        insert(_el$77, () => props.description);
        return _el$77;
      })();
    })(), _el$72, _co$26);
    insert(_el$68, () => props.controls, _el$74, _co$27);
    insert(_el$67, () => props.children, _el$76, _co$28);
    createRenderEffect(() => setAttribute(_el$67, "id", props.id));
    return _el$67;
  })();
}
function SectionTitle(props) {
  return (() => {
    var _el$78 = getNextElement(_tmpl$9), _el$79 = _el$78.firstChild, _el$81 = _el$79.firstChild, [_el$82, _co$29] = getNextMarker(_el$81.nextSibling);
    _el$82.nextSibling;
    var _el$83 = _el$79.nextSibling, _el$84 = _el$83.nextSibling;
    insert(_el$79, () => props.title, _el$82, _co$29);
    insert(_el$84, () => props.description);
    return _el$78;
  })();
}
function SectionBridge(props) {
  return (() => {
    var _el$85 = getNextElement(_tmpl$0), _el$86 = _el$85.firstChild, _el$87 = _el$86.nextSibling, _el$88 = _el$87.nextSibling;
    insert(_el$88, () => props.label);
    createRenderEffect(() => setAttribute(_el$85, "href", props.href));
    return _el$85;
  })();
}
function EmptyState(props) {
  return (() => {
    var _el$89 = getNextElement(_tmpl$1), _el$90 = _el$89.firstChild, _el$91 = _el$90.nextSibling;
    insert(_el$90, () => props.title);
    insert(_el$91, () => props.description);
    return _el$89;
  })();
}
function formatUpdatedAtParts(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return {
    date: "just now",
    time: ""
  };
  return {
    date: new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      timeZone
    }).format(date),
    time: new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short"
    }).format(date)
  };
}
function formatUpdatedAtLabel(value) {
  if (!value.time) return value.date;
  return `${value.date}, ${value.time}`;
}
function TopModelsSection(props) {
  const [product, setProduct] = createSignal("Go");
  const [range, setRange] = createSignal("2M");
  const [sheet, setSheet] = createSignal();
  const [activeModel, setActiveModel] = createSignal();
  const data = createMemo(() => props.data[product()][range()]);
  const leaderboard = createMemo(() => props.leaderboard[product()][range()]);
  createEffect(() => {
    if (!sheet()) return;
    if (typeof document === "undefined") return;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSheet(void 0);
    };
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", onKeyDown);
    });
  });
  return (() => {
    var _el$92 = getNextElement(_tmpl$10), _el$93 = _el$92.firstChild, _el$102 = _el$93.nextSibling, [_el$103, _co$33] = getNextMarker(_el$102.nextSibling), _el$104 = _el$103.nextSibling, [_el$105, _co$34] = getNextMarker(_el$104.nextSibling), _el$94 = _el$105.nextSibling, _el$100 = _el$94.firstChild, [_el$101, _co$32] = getNextMarker(_el$100.nextSibling), _el$95 = _el$101.nextSibling, _el$96 = _el$95.firstChild, [_el$97, _co$30] = getNextMarker(_el$96.nextSibling), _el$98 = _el$97.nextSibling, [_el$99, _co$31] = getNextMarker(_el$98.nextSibling), _el$106 = _el$94.nextSibling, [_el$107, _co$35] = getNextMarker(_el$106.nextSibling);
    insert(_el$92, createComponent(Show, {
      get when() {
        return data().some((item) => usageTotal(item) > 0);
      },
      get fallback() {
        return createComponent(EmptyState, {
          title: "No usage data",
          description: "No model_stat rows matched this product and range."
        });
      },
      get children() {
        return createComponent(TopModelsChart, {
          get data() {
            return data();
          },
          get range() {
            return range();
          },
          get activeModel() {
            return activeModel();
          },
          onActiveModelChange: setActiveModel
        });
      }
    }), _el$103, _co$33);
    insert(_el$92, createComponent(Show, {
      get when() {
        return leaderboard().length > 0;
      },
      get fallback() {
        return createComponent(EmptyState, {
          title: "No leaderboard data",
          description: "No model_stat rows matched this product and range."
        });
      },
      get children() {
        return createComponent(Leaderboard, {
          get data() {
            return leaderboard();
          },
          get activeModel() {
            return activeModel();
          },
          onActiveModelChange: setActiveModel
        });
      }
    }), _el$105, _co$34);
    insert(_el$94, createComponent(StatsFilters, {
      get product() {
        return product();
      },
      get range() {
        return range();
      },
      onProductSelect: setProduct,
      onRangeSelect: setRange
    }), _el$101, _co$32);
    insert(_el$95, createComponent(MobileFilterButton, {
      label: "Product filter",
      get value() {
        return product();
      },
      get expanded() {
        return sheet() === "product";
      },
      onClick: () => setSheet(sheet() === "product" ? void 0 : "product")
    }), _el$97, _co$30);
    insert(_el$95, createComponent(MobileFilterButton, {
      label: "Date range",
      get value() {
        return range();
      },
      get expanded() {
        return sheet() === "range";
      },
      onClick: () => setSheet(sheet() === "range" ? void 0 : "range")
    }), _el$99, _co$31);
    insert(_el$92, createComponent(Show, {
      get when() {
        return sheet();
      },
      children: (kind) => createComponent(MobileFilterSheet, {
        get kind() {
          return kind();
        },
        get product() {
          return product();
        },
        get range() {
          return range();
        },
        onProductSelect: (value) => {
          setProduct(value);
          setSheet(void 0);
        },
        onRangeSelect: (value) => {
          setRange(value);
          setSheet(void 0);
        },
        onClose: () => setSheet(void 0)
      })
    }), _el$107, _co$35);
    return _el$92;
  })();
}
function MobileFilterButton(props) {
  return (() => {
    var _el$108 = getNextElement(_tmpl$11), _el$109 = _el$108.firstChild, _el$110 = _el$109.nextSibling, [_el$111, _co$36] = getNextMarker(_el$110.nextSibling);
    addEventListener(_el$108, "click", props.onClick, true);
    insert(_el$109, () => props.value);
    insert(_el$108, createComponent(ChevronDown, {}), _el$111, _co$36);
    createRenderEffect((_p$) => {
      var _v$ = props.label, _v$2 = props.expanded ? "true" : "false";
      _v$ !== _p$.e && setAttribute(_el$108, "aria-label", _p$.e = _v$);
      _v$2 !== _p$.t && setAttribute(_el$108, "aria-expanded", _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    runHydrationEvents();
    return _el$108;
  })();
}
function MobileFilterSheet(props) {
  return (() => {
    var _el$112 = getNextElement(_tmpl$12), _el$113 = _el$112.firstChild;
    addEventListener(_el$112, "click", props.onClose, true);
    insert(_el$113, createComponent(Show, {
      get when() {
        return props.kind === "product";
      },
      get fallback() {
        return createComponent(For, {
          each: ranges,
          children: (item) => (() => {
            var _el$114 = getNextElement(_tmpl$13);
            _el$114.$$click = (event) => {
              event.stopPropagation();
              props.onRangeSelect(item);
            };
            insert(_el$114, () => rangeLabels[item]);
            createRenderEffect((_p$) => {
              var _v$3 = props.range === item, _v$4 = props.range === item ? "true" : void 0;
              _v$3 !== _p$.e && setAttribute(_el$114, "aria-checked", _p$.e = _v$3);
              _v$4 !== _p$.t && setAttribute(_el$114, "data-active", _p$.t = _v$4);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            runHydrationEvents();
            return _el$114;
          })()
        });
      },
      get children() {
        return createComponent(For, {
          each: products,
          children: (item) => (() => {
            var _el$115 = getNextElement(_tmpl$13);
            _el$115.$$click = (event) => {
              event.stopPropagation();
              props.onProductSelect(item);
            };
            insert(_el$115, item);
            createRenderEffect((_p$) => {
              var _v$5 = props.product === item, _v$6 = props.product === item ? "true" : void 0;
              _v$5 !== _p$.e && setAttribute(_el$115, "aria-checked", _p$.e = _v$5);
              _v$6 !== _p$.t && setAttribute(_el$115, "data-active", _p$.t = _v$6);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            runHydrationEvents();
            return _el$115;
          })()
        });
      }
    }));
    createRenderEffect(() => setAttribute(_el$113, "aria-label", props.kind === "product" ? "Product filter" : "Date range"));
    runHydrationEvents();
    return _el$112;
  })();
}
function ChevronDown() {
  return getNextElement(_tmpl$14);
}
function StatsFilters(props) {
  return [createComponent(FilterPills, {
    items: products,
    get selected() {
      return props.product;
    },
    label: "Product filter",
    variant: "product",
    get onSelect() {
      return props.onProductSelect;
    }
  }), createComponent(FilterPills, {
    items: ranges,
    get selected() {
      return props.range;
    },
    label: "Date range",
    variant: "range",
    get onSelect() {
      return props.onRangeSelect;
    }
  })];
}
function FilterPills(props) {
  return (() => {
    var _el$117 = getNextElement(_tmpl$15);
    insert(_el$117, createComponent(For, {
      get each() {
        return props.items;
      },
      children: (item) => (() => {
        var _el$118 = getNextElement(_tmpl$13);
        _el$118.$$click = () => props.onSelect(item);
        insert(_el$118, item);
        createRenderEffect((_p$) => {
          var _v$9 = props.selected === item, _v$0 = props.selected === item ? "true" : void 0;
          _v$9 !== _p$.e && setAttribute(_el$118, "aria-checked", _p$.e = _v$9);
          _v$0 !== _p$.t && setAttribute(_el$118, "data-active", _p$.t = _v$0);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        runHydrationEvents();
        return _el$118;
      })()
    }));
    createRenderEffect((_p$) => {
      var _v$7 = props.variant, _v$8 = props.label;
      _v$7 !== _p$.e && setAttribute(_el$117, "data-variant", _p$.e = _v$7);
      _v$8 !== _p$.t && setAttribute(_el$117, "aria-label", _p$.t = _v$8);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$117;
  })();
}
function TopModelsChart(props) {
  let chartRef;
  const [activeIndex, setActiveIndex] = createSignal();
  const maxTotal = createMemo(() => getTopModelsMaxTotal(props.data));
  const segmentOrder = createMemo(() => getTopModelsSegmentOrder(props.data));
  const activePoint = createMemo(() => props.data[activeIndex() ?? -1]);
  createEffect(() => scrollDenseChartToEnd(chartRef, props.range, props.data.length));
  return (() => {
    var _el$119 = getNextElement(_tmpl$16), _el$120 = _el$119.firstChild, _el$121 = _el$120.nextSibling;
    _el$119.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      setActiveIndex(void 0);
      props.onActiveModelChange(void 0);
    });
    var _ref$ = chartRef;
    typeof _ref$ === "function" ? use(_ref$, _el$119) : chartRef = _el$119;
    insert(_el$120, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (day, index) => (() => {
        var _el$122 = getNextElement(_tmpl$17), _el$123 = _el$122.firstChild, _el$124 = _el$123.firstChild, _el$125 = _el$124.nextSibling, _el$126 = _el$125.firstChild, _el$127 = _el$126.nextSibling;
        insert(_el$124, () => formatTokens(usageTotal(day)));
        insert(_el$126, () => day.date);
        insert(_el$127, () => formatTopModelsMobileDate(day.date, props.range));
        createRenderEffect((_p$) => {
          var _v$12 = activeIndex() === index() ? "true" : void 0, _v$13 = isColumnLabelHidden(index(), props.data.length) ? "true" : void 0, _v$14 = isTopModelsMobileAxisHidden(index(), props.data.length) ? "true" : void 0;
          _v$12 !== _p$.e && setAttribute(_el$122, "data-active", _p$.e = _v$12);
          _v$13 !== _p$.t && setAttribute(_el$122, "data-label-hidden", _p$.t = _v$13);
          _v$14 !== _p$.a && setAttribute(_el$122, "data-mobile-hidden", _p$.a = _v$14);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$122;
      })()
    }));
    _el$121.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      setActiveIndex(void 0);
      props.onActiveModelChange(void 0);
    });
    insert(_el$121, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (day, dayIndex) => (() => {
        var _el$128 = getNextElement(_tmpl$18), _el$129 = _el$128.firstChild, _el$130 = _el$129.nextSibling, [_el$131, _co$37] = getNextMarker(_el$130.nextSibling);
        _el$128.$$keydown = (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setActiveIndex(dayIndex());
          props.onActiveModelChange(void 0);
        };
        _el$128.addEventListener("blur", () => {
          setActiveIndex(void 0);
          props.onActiveModelChange(void 0);
        });
        _el$128.addEventListener("focus", () => {
          setActiveIndex(dayIndex());
          props.onActiveModelChange(void 0);
        });
        _el$128.$$click = () => {
          setActiveIndex(dayIndex());
          props.onActiveModelChange(void 0);
        };
        _el$128.$$pointermove = (event) => {
          if (event.pointerType === "touch") return;
          setActiveIndex(dayIndex());
          if (isTopModelsBlankHover(event.currentTarget, event.clientY)) props.onActiveModelChange(void 0);
        };
        _el$128.addEventListener("pointerenter", (event) => {
          setActiveIndex(dayIndex());
          if (isTopModelsBlankHover(event.currentTarget, event.clientY)) props.onActiveModelChange(void 0);
        });
        _el$128.$$pointerdown = (event) => {
          if (event.pointerType !== "touch") return;
          setActiveIndex(dayIndex());
          props.onActiveModelChange(void 0);
        };
        insert(_el$129, createComponent(For, {
          get each() {
            return stackedTopModelsSegments(day, segmentOrder());
          },
          children: (item) => (() => {
            var _el$132 = getNextElement(_tmpl$19);
            _el$132.$$click = (event) => {
              event.stopPropagation();
              setActiveIndex(dayIndex());
              props.onActiveModelChange(item.segment.model);
            };
            _el$132.$$pointerdown = (event) => {
              event.stopPropagation();
              setActiveIndex(dayIndex());
              props.onActiveModelChange(item.segment.model);
            };
            _el$132.addEventListener("pointerenter", (event) => {
              event.stopPropagation();
              setActiveIndex(dayIndex());
              props.onActiveModelChange(item.segment.model);
            });
            createRenderEffect((_p$) => {
              var _v$20 = item.index, _v$21 = item.segment.model, _v$22 = props.activeModel === item.segment.model ? "true" : void 0, _v$23 = getTopModelsSegmentColor(item.segment.model, item.index, segmentOrder(), activeIndex() !== void 0 && activeIndex() !== dayIndex(), props.activeModel);
              _v$20 !== _p$.e && setAttribute(_el$132, "data-series", _p$.e = _v$20);
              _v$21 !== _p$.t && setAttribute(_el$132, "data-model", _p$.t = _v$21);
              _v$22 !== _p$.a && setAttribute(_el$132, "data-active", _p$.a = _v$22);
              _v$23 !== _p$.o && setStyleProperty(_el$132, "background", _p$.o = _v$23);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            runHydrationEvents();
            return _el$132;
          })()
        }));
        insert(_el$128, createComponent(Show, {
          get when() {
            return memo(() => activeIndex() === dayIndex())() && activePoint();
          },
          children: (point) => (() => {
            var _el$133 = getNextElement(_tmpl$20), _el$134 = _el$133.firstChild, _el$135 = _el$134.nextSibling, _el$137 = _el$135.firstChild, [_el$138, _co$38] = getNextMarker(_el$137.nextSibling);
            _el$138.nextSibling;
            var _el$139 = _el$135.nextSibling, _el$140 = _el$139.nextSibling, [_el$141, _co$39] = getNextMarker(_el$140.nextSibling);
            insert(_el$134, () => point().date);
            insert(_el$135, () => formatTokens(usageTotal(point())), _el$138, _co$38);
            insert(_el$133, createComponent(For, {
              get each() {
                return visibleTopModelsSegments(point());
              },
              children: (item) => (() => {
                var _el$142 = getNextElement(_tmpl$21), _el$143 = _el$142.firstChild, _el$144 = _el$143.firstChild, _el$145 = _el$144.nextSibling, _el$146 = _el$145.nextSibling, [_el$147, _co$40] = getNextMarker(_el$146.nextSibling), _el$148 = _el$143.nextSibling;
                insert(_el$143, () => item.segment.model, _el$147, _co$40);
                insert(_el$148, () => formatTokens(item.segment.value));
                createRenderEffect((_p$) => {
                  var _v$24 = props.activeModel === item.segment.model ? "true" : void 0, _v$25 = props.activeModel !== void 0 && props.activeModel !== item.segment.model ? "true" : void 0, _v$26 = getRankColor(item.segment.model, item.index, segmentOrder(), usageColors);
                  _v$24 !== _p$.e && setAttribute(_el$142, "data-active", _p$.e = _v$24);
                  _v$25 !== _p$.t && setAttribute(_el$142, "data-muted", _p$.t = _v$25);
                  _v$26 !== _p$.a && setStyleProperty(_el$144, "background", _p$.a = _v$26);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0
                });
                return _el$142;
              })()
            }), _el$141, _co$39);
            createRenderEffect(() => setAttribute(_el$133, "data-placement", dayIndex() > props.data.length * 0.62 ? "left" : "right"));
            return _el$133;
          })()
        }), _el$131, _co$37);
        createRenderEffect((_p$) => {
          var _v$15 = `${day.date} ${formatTokens(usageTotal(day))}`, _v$16 = activeIndex() === dayIndex() ? "true" : void 0, _v$17 = activeIndex() !== void 0 && activeIndex() !== dayIndex() ? "true" : void 0, _v$18 = `${getTopModelsBarHeight(usageTotal(day), maxTotal())}%`, _v$19 = getTopModelsSegmentRows(day, segmentOrder());
          _v$15 !== _p$.e && setAttribute(_el$128, "aria-label", _p$.e = _v$15);
          _v$16 !== _p$.t && setAttribute(_el$128, "data-active", _p$.t = _v$16);
          _v$17 !== _p$.a && setAttribute(_el$128, "data-muted", _p$.a = _v$17);
          _v$18 !== _p$.o && setStyleProperty(_el$128, "--top-models-bar-height", _p$.o = _v$18);
          _v$19 !== _p$.i && setStyleProperty(_el$129, "grid-template-rows", _p$.i = _v$19);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0,
          i: void 0
        });
        runHydrationEvents();
        return _el$128;
      })()
    }));
    createRenderEffect((_p$) => {
      var _v$1 = props.range, _v$10 = isDenseColumnRange(props.range) ? "true" : void 0, _v$11 = {
        "--top-models-count": props.data.length
      };
      _v$1 !== _p$.e && setAttribute(_el$119, "data-range", _p$.e = _v$1);
      _v$10 !== _p$.t && setAttribute(_el$119, "data-dense-labels", _p$.t = _v$10);
      _p$.a = style(_el$119, _v$11, _p$.a);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$119;
  })();
}
function isTopModelsBlankHover(bar, clientY) {
  const stack = bar.querySelector('[data-slot="top-models-stack"]');
  if (!stack) return true;
  return clientY < stack.getBoundingClientRect().top - 6;
}
function getTopModelsBarHeight(total, max) {
  if (total <= 0) return 0;
  return Math.max(2, Math.min(100, total / max * 100));
}
function getTopModelsMaxTotal(data) {
  const max = Math.max(0, ...data.map((item) => usageTotal(item)));
  if (max === 0) return 1;
  if (data.length === 1) return max * 1.75;
  return max;
}
function getTopModelsSegmentRows(point, order) {
  const total = usageTotal(point);
  if (total <= 0) return "";
  return stackedTopModelsSegments(point, order).map((item) => `${item.segment.value / total * 100}%`).join(" ");
}
function visibleTopModelsSegments(point) {
  return point.segments.map((segment, index) => ({
    segment,
    index
  })).filter((item) => item.segment.value > 0);
}
function stackedTopModelsSegments(point, order) {
  return visibleTopModelsSegments(point).slice().sort((a, b) => (order.get(b.segment.model) ?? b.index) - (order.get(a.segment.model) ?? a.index));
}
function getTopModelsSegmentOrder(data) {
  return new Map(data.find((point) => point.segments.length > 0)?.segments.map((segment, index) => [segment.model, index]) ?? []);
}
function getTopModelsSegmentColor(model, index, order, muted, activeModel) {
  if (activeModel !== void 0) return activeModel === model ? getRankColor(model, index, order, usageColors) : "var(--stats-layer-2)";
  if (muted) return "var(--stats-layer-2)";
  return getRankColor(model, index, order, usageColors);
}
function isTopModelsMobileAxisHidden(index, count) {
  return count > 7 && index % 2 === 1;
}
function isColumnLabelHidden(index, count) {
  if (count <= 20) return false;
  const interval = Math.ceil(count / 8);
  return index !== count - 1 && index % interval !== 0;
}
function isDenseColumnRange(range) {
  return range === "1M" || range === "2M";
}
function scrollDenseChartToEnd(element, range, count) {
  if (!element || count <= 0 || !isDenseColumnRange(range) || typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
  });
}
function formatTopModelsMobileDate(label, range) {
  if (range === "1M" || range === "2M") return label.split(" - ")[0] ?? label;
  return label;
}
function usageTotal(point) {
  return point.segments.reduce((sum, item) => sum + item.value, 0);
}
function formatTokens(value) {
  if (value >= 1) return `${value.toFixed(value >= 10 ? 0 : 1)}T`;
  return `${Math.round(value * 1e3)}B`;
}
function Leaderboard(props) {
  const featured = createMemo(() => props.data.slice(0, 3));
  const compact = createMemo(() => props.data.slice(3));
  return (() => {
    var _el$149 = getNextElement(_tmpl$22), _el$150 = _el$149.firstChild, _el$151 = _el$150.nextSibling, _el$152 = _el$151.nextSibling, _el$153 = _el$152.nextSibling;
    insert(_el$150, createComponent(For, {
      get each() {
        return featured();
      },
      children: (entry) => createComponent(LeaderboardCard, {
        entry,
        size: "featured",
        get active() {
          return props.activeModel === entry.model;
        },
        get onActiveModelChange() {
          return props.onActiveModelChange;
        }
      })
    }));
    insert(_el$152, createComponent(For, {
      get each() {
        return compact();
      },
      children: (entry) => createComponent(LeaderboardCard, {
        entry,
        size: "compact",
        get active() {
          return props.activeModel === entry.model;
        },
        get onActiveModelChange() {
          return props.onActiveModelChange;
        }
      })
    }));
    insert(_el$153, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (entry) => createComponent(LeaderboardCard, {
        entry,
        size: "featured",
        get active() {
          return props.activeModel === entry.model;
        },
        get onActiveModelChange() {
          return props.onActiveModelChange;
        }
      })
    }));
    return _el$149;
  })();
}
function LeaderboardCard(props) {
  return (() => {
    var _el$154 = getNextElement(_tmpl$23), _el$155 = _el$154.firstChild, _el$166 = _el$155.nextSibling, [_el$167, _co$42] = getNextMarker(_el$166.nextSibling), _el$156 = _el$167.nextSibling, _el$164 = _el$156.firstChild, [_el$165, _co$41] = getNextMarker(_el$164.nextSibling), _el$157 = _el$165.nextSibling, _el$158 = _el$157.firstChild, _el$159 = _el$158.firstChild, _el$160 = _el$159.nextSibling, _el$161 = _el$158.nextSibling, _el$162 = _el$161.firstChild, _el$163 = _el$162.nextSibling;
    _el$154.$$click = () => props.onActiveModelChange(props.entry.model);
    _el$154.addEventListener("blur", () => props.onActiveModelChange(void 0));
    _el$154.addEventListener("focus", () => props.onActiveModelChange(props.entry.model));
    _el$154.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      props.onActiveModelChange(void 0);
    });
    _el$154.addEventListener("pointerenter", () => props.onActiveModelChange(props.entry.model));
    insert(_el$155, () => String(props.entry.rank).padStart(2, "0"));
    insert(_el$154, createComponent(ProviderIcon, {
      "data-slot": "leader-watermark",
      "aria-hidden": "true",
      get id() {
        return getProviderIconId(props.entry.author);
      }
    }), _el$167, _co$42);
    insert(_el$156, createComponent(ProviderIcon, {
      "data-slot": "leader-avatar",
      "aria-hidden": "true",
      get id() {
        return getProviderIconId(props.entry.author);
      }
    }), _el$165, _co$41);
    insert(_el$159, () => props.entry.model);
    insert(_el$160, () => formatBillions(props.entry.tokens));
    insert(_el$162, () => props.entry.author);
    insert(_el$163, () => formatChange(props.entry.change));
    createRenderEffect((_p$) => {
      var _v$27 = props.size, _v$28 = props.active ? "true" : void 0, _v$29 = `${"/data/"}${modelSlug(props.entry.provider)}/${modelSlug(props.entry.model)}`, _v$30 = `${String(props.entry.rank).padStart(2, "0")} ${props.entry.model} by ${props.entry.author}`, _v$31 = props.entry.change === null ? "true" : void 0, _v$32 = props.entry.change !== null && props.entry.change < 0 ? "true" : void 0;
      _v$27 !== _p$.e && setAttribute(_el$154, "data-size", _p$.e = _v$27);
      _v$28 !== _p$.t && setAttribute(_el$154, "data-active", _p$.t = _v$28);
      _v$29 !== _p$.a && setAttribute(_el$154, "href", _p$.a = _v$29);
      _v$30 !== _p$.o && setAttribute(_el$154, "aria-label", _p$.o = _v$30);
      _v$31 !== _p$.i && setAttribute(_el$163, "data-new", _p$.i = _v$31);
      _v$32 !== _p$.n && setAttribute(_el$163, "data-negative", _p$.n = _v$32);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0
    });
    runHydrationEvents();
    return _el$154;
  })();
}
function getProviderIconId(author) {
  if (author === "MiniMax") return "minimax";
  if (author === "Moonshot") return "moonshotai";
  if (author === "Zhipu") return "zhipuai";
  return author.toLowerCase();
}
function formatBillions(value) {
  if (value >= 1e3) return `${(value / 1e3).toFixed(value >= 1e4 ? 0 : 1)}T`;
  return `${value}B`;
}
function formatChange(value) {
  if (value === null) return "New";
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}
function MarketShareSection(props) {
  const [range, setRange] = createSignal("2M");
  const [activeIndex, setActiveIndex] = createSignal(2);
  const [activeAuthor, setActiveAuthor] = createSignal();
  const [inspecting, setInspecting] = createSignal(false);
  const data = createMemo(() => props.data[range()]);
  const authorOrder = createMemo(() => getMarketAuthorOrder(data()));
  const selectedIndex = createMemo(() => Math.min(activeIndex(), Math.max(data().length - 1, 0)));
  const activeDay = createMemo(() => data()[selectedIndex()]);
  return (() => {
    var _el$168 = getNextElement(_tmpl$24), _el$174 = _el$168.firstChild, [_el$175, _co$43] = getNextMarker(_el$174.nextSibling), _el$176 = _el$175.nextSibling, [_el$177, _co$44] = getNextMarker(_el$176.nextSibling), _el$178 = _el$177.nextSibling, [_el$179, _co$45] = getNextMarker(_el$178.nextSibling), _el$169 = _el$179.nextSibling, _el$170 = _el$169.firstChild, _el$171 = _el$170.firstChild, _el$172 = _el$171.nextSibling, _el$173 = _el$170.nextSibling;
    _el$168.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      setActiveAuthor(void 0);
      setInspecting(false);
    });
    insert(_el$168, createComponent(SectionBridge, {
      label: "CACHE RATIO",
      href: "#cache-ratio"
    }), _el$175, _co$43);
    insert(_el$168, createComponent(SectionTitle, {
      title: "Market Share",
      description: "Compare token share by model author."
    }), _el$177, _co$44);
    insert(_el$168, createComponent(Show, {
      get when() {
        return activeDay();
      },
      get fallback() {
        return createComponent(EmptyState, {
          title: "No market data",
          description: "No model_stat rows matched this range."
        });
      },
      children: (day) => [createComponent(MarketShare, {
        get data() {
          return data();
        },
        get range() {
          return range();
        },
        get authorOrder() {
          return authorOrder();
        },
        get activeIndex() {
          return selectedIndex();
        },
        get activeAuthor() {
          return activeAuthor();
        },
        get inspecting() {
          return inspecting();
        },
        onActiveIndexChange: (index) => {
          setActiveIndex(index);
          setInspecting(true);
        },
        onActiveAuthorChange: (author) => {
          setActiveAuthor(author);
          setInspecting(true);
        }
      }), createComponent(MarketShareList, {
        get data() {
          return day().authors;
        },
        get authorOrder() {
          return authorOrder();
        },
        get activeAuthor() {
          return activeAuthor();
        },
        onActiveAuthorChange: (author) => {
          setActiveAuthor(author);
          setInspecting(true);
        }
      })]
    }), _el$179, _co$45);
    insert(_el$172, (() => {
      var _c$3 = memo(() => !!inspecting());
      return () => _c$3() ? formatMarketDate(activeDay()) : formatMarketRange(data());
    })());
    insert(_el$173, createComponent(FilterPills, {
      items: ranges,
      get selected() {
        return range();
      },
      label: "Date range",
      variant: "range",
      onSelect: (item) => {
        setRange(item);
        setActiveAuthor(void 0);
        setInspecting(false);
      }
    }));
    return _el$168;
  })();
}
function MarketShare(props) {
  let chartRef;
  createEffect(() => scrollDenseChartToEnd(chartRef, props.range, props.data.length));
  return (() => {
    var _el$180 = getNextElement(_tmpl$25), _el$181 = _el$180.firstChild, _el$182 = _el$181.nextSibling;
    var _ref$2 = chartRef;
    typeof _ref$2 === "function" ? use(_ref$2, _el$180) : chartRef = _el$180;
    insert(_el$181, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (day, index) => (() => {
        var _el$183 = getNextElement(_tmpl$26), _el$184 = _el$183.firstChild, _el$185 = _el$184.firstChild, _el$186 = _el$185.nextSibling, _el$187 = _el$186.firstChild, _el$188 = _el$187.nextSibling;
        _el$183.addEventListener("pointerenter", () => props.onActiveIndexChange(index()));
        _el$183.$$click = () => props.onActiveIndexChange(index());
        insert(_el$185, () => formatTrillions(day.total));
        insert(_el$187, () => day.date);
        insert(_el$188, () => formatMarketMobileDate(day.date));
        createRenderEffect((_p$) => {
          var _v$36 = props.inspecting && props.activeIndex === index() ? "true" : void 0, _v$37 = isColumnLabelHidden(index(), props.data.length) ? "true" : void 0, _v$38 = isMarketMobileLabelHidden(index(), props.data.length) ? "true" : void 0;
          _v$36 !== _p$.e && setAttribute(_el$183, "data-active", _p$.e = _v$36);
          _v$37 !== _p$.t && setAttribute(_el$183, "data-label-hidden", _p$.t = _v$37);
          _v$38 !== _p$.a && setAttribute(_el$183, "data-mobile-hidden", _p$.a = _v$38);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        runHydrationEvents();
        return _el$183;
      })()
    }));
    insert(_el$182, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (day, index) => (() => {
        var _el$189 = getNextElement(_tmpl$27);
        _el$189.addEventListener("pointerenter", () => props.onActiveIndexChange(index()));
        _el$189.$$click = () => props.onActiveIndexChange(index());
        insert(_el$189, createComponent(For, {
          get each() {
            return stackedMarketAuthors(day, props.authorOrder);
          },
          children: (item) => (() => {
            var _el$190 = getNextElement(_tmpl$28);
            _el$190.$$click = (event) => {
              event.stopPropagation();
              props.onActiveIndexChange(index());
              props.onActiveAuthorChange(item.author.author);
            };
            _el$190.$$pointerdown = (event) => {
              event.stopPropagation();
              props.onActiveIndexChange(index());
              props.onActiveAuthorChange(item.author.author);
            };
            _el$190.addEventListener("pointerenter", (event) => {
              event.stopPropagation();
              props.onActiveIndexChange(index());
              props.onActiveAuthorChange(item.author.author);
            });
            createRenderEffect((_p$) => {
              var _v$41 = item.author.author, _v$42 = props.activeAuthor === item.author.author ? "true" : void 0, _v$43 = props.activeAuthor !== void 0 && props.activeAuthor !== item.author.author ? "true" : void 0, _v$44 = getMarketSegmentColor(item.author.author, getRankColor(item.author.author, item.index, props.authorOrder, marketColors), props.activeAuthor), _v$45 = item.author.share;
              _v$41 !== _p$.e && setAttribute(_el$190, "data-author", _p$.e = _v$41);
              _v$42 !== _p$.t && setAttribute(_el$190, "data-active", _p$.t = _v$42);
              _v$43 !== _p$.a && setAttribute(_el$190, "data-muted", _p$.a = _v$43);
              _v$44 !== _p$.o && setStyleProperty(_el$190, "background-color", _p$.o = _v$44);
              _v$45 !== _p$.i && setStyleProperty(_el$190, "flex-grow", _p$.i = _v$45);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0
            });
            runHydrationEvents();
            return _el$190;
          })()
        }));
        createRenderEffect((_p$) => {
          var _v$39 = `${day.date} ${formatTrillions(day.total)}`, _v$40 = props.inspecting && props.activeIndex === index() ? "true" : void 0;
          _v$39 !== _p$.e && setAttribute(_el$189, "aria-label", _p$.e = _v$39);
          _v$40 !== _p$.t && setAttribute(_el$189, "data-active", _p$.t = _v$40);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        runHydrationEvents();
        return _el$189;
      })()
    }));
    createRenderEffect((_p$) => {
      var _v$33 = props.range, _v$34 = isDenseColumnRange(props.range) ? "true" : void 0, _v$35 = {
        "--market-count": props.data.length
      };
      _v$33 !== _p$.e && setAttribute(_el$180, "data-range", _p$.e = _v$33);
      _v$34 !== _p$.t && setAttribute(_el$180, "data-dense-labels", _p$.t = _v$34);
      _p$.a = style(_el$180, _v$35, _p$.a);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$180;
  })();
}
function MarketShareList(props) {
  return (() => {
    var _el$191 = getNextElement(_tmpl$29);
    insert(_el$191, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (item, index) => (() => {
        var _el$192 = getNextElement(_tmpl$30), _el$193 = _el$192.firstChild, _el$194 = _el$193.nextSibling, _el$195 = _el$194.nextSibling, _el$196 = _el$195.nextSibling, _el$197 = _el$196.nextSibling, _el$199 = _el$197.firstChild, [_el$200, _co$46] = getNextMarker(_el$199.nextSibling);
        _el$200.nextSibling;
        _el$192.$$keydown = (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          props.onActiveAuthorChange(item.author);
        };
        _el$192.addEventListener("focus", () => props.onActiveAuthorChange(item.author));
        _el$192.addEventListener("pointerenter", () => props.onActiveAuthorChange(item.author));
        insert(_el$193, () => String(index() + 1).padStart(2, "0"));
        insert(_el$195, () => item.author);
        insert(_el$196, () => formatTrillions(item.tokens));
        insert(_el$197, () => item.share.toFixed(1), _el$200, _co$46);
        createRenderEffect((_p$) => {
          var _v$46 = `${item.author} ${formatTrillions(item.tokens)} ${item.share.toFixed(1)} percent`, _v$47 = props.activeAuthor === item.author ? "true" : void 0, _v$48 = getRankColor(item.author, index(), props.authorOrder, marketColors);
          _v$46 !== _p$.e && setAttribute(_el$192, "aria-label", _p$.e = _v$46);
          _v$47 !== _p$.t && setAttribute(_el$192, "data-active", _p$.t = _v$47);
          _v$48 !== _p$.a && setStyleProperty(_el$194, "background", _p$.a = _v$48);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        runHydrationEvents();
        return _el$192;
      })()
    }));
    return _el$191;
  })();
}
function GeoBreakdownSection(props) {
  const [activeCountry, setActiveCountry] = createSignal();
  const data = createMemo(() => props.data["2M"]);
  const countryById = createMemo(() => new Map(data().flatMap((country) => {
    const id = countryNumericId(country.country);
    return id ? [[id, country]] : [];
  })));
  const maxTokens = createMemo(() => Math.max(0, ...data().map((country) => country.tokens)) || 1);
  const topCountries = createMemo(() => data().slice(0, 15));
  const active = createMemo(() => data().find((country) => country.country === activeCountry()) ?? data()[0]);
  return (() => {
    var _el$201 = getNextElement(_tmpl$32), _el$210 = _el$201.firstChild, [_el$211, _co$50] = getNextMarker(_el$210.nextSibling), _el$212 = _el$211.nextSibling, [_el$213, _co$51] = getNextMarker(_el$212.nextSibling), _el$214 = _el$213.nextSibling, [_el$215, _co$52] = getNextMarker(_el$214.nextSibling);
    _el$201.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      setActiveCountry(void 0);
    });
    insert(_el$201, createComponent(SectionBridge, {
      label: "MARKET SHARE",
      href: "#market-share"
    }), _el$211, _co$50);
    insert(_el$201, createComponent(SectionTitle, {
      title: "Geo Breakdown",
      description: "Tokens used by country."
    }), _el$213, _co$51);
    insert(_el$201, createComponent(Show, {
      get when() {
        return data().length > 0;
      },
      get fallback() {
        return createComponent(EmptyState, {
          title: "No geo data",
          description: "No geo_stat rows matched this range."
        });
      },
      get children() {
        var _el$202 = getNextElement(_tmpl$31), _el$203 = _el$202.firstChild, _el$204 = _el$203.firstChild, [_el$205, _co$47] = getNextMarker(_el$204.nextSibling), _el$206 = _el$205.nextSibling, [_el$207, _co$48] = getNextMarker(_el$206.nextSibling), _el$208 = _el$203.nextSibling, [_el$209, _co$49] = getNextMarker(_el$208.nextSibling);
        insert(_el$203, createComponent(GeoWorldMap, {
          get countryById() {
            return countryById();
          },
          get activeCountry() {
            return activeCountry();
          },
          get maxTokens() {
            return maxTokens();
          },
          onActiveCountryChange: setActiveCountry
        }), _el$205, _co$47);
        insert(_el$203, createComponent(Show, {
          get when() {
            return active();
          },
          children: (country) => (() => {
            var _el$216 = getNextElement(_tmpl$33), _el$217 = _el$216.firstChild, _el$218 = _el$217.firstChild, _el$219 = _el$218.nextSibling, [_el$220, _co$53] = getNextMarker(_el$219.nextSibling), _el$221 = _el$217.nextSibling, _el$222 = _el$221.nextSibling, _el$223 = _el$222.firstChild, _el$224 = _el$223.nextSibling;
            insert(_el$217, () => String(country().rank).padStart(2, "0"), _el$220, _co$53);
            insert(_el$221, () => formatCountryName(country().country));
            insert(_el$223, () => formatGeoTokens(country().tokens));
            insert(_el$224, () => formatGeoShare(country().share));
            return _el$216;
          })()
        }), _el$207, _co$48);
        insert(_el$202, createComponent(GeoCountryList, {
          get data() {
            return topCountries();
          },
          get activeCountry() {
            return activeCountry();
          },
          get maxTokens() {
            return maxTokens();
          },
          onActiveCountryChange: setActiveCountry
        }), _el$209, _co$49);
        return _el$202;
      }
    }), _el$215, _co$52);
    return _el$201;
  })();
}
function GeoWorldMap(props) {
  const opacityScale = createMemo(() => sqrt().domain([0, props.maxTokens]).range([0.26, 0.96]).clamp(true));
  const countryOpacity = (country) => {
    if (!country) return 0;
    const opacity = opacityScale()(country.tokens);
    if (!props.activeCountry || props.activeCountry === country.country) return opacity;
    return Math.max(0.18, opacity * 0.36);
  };
  return (() => {
    var _el$225 = getNextElement(_tmpl$34), _el$226 = _el$225.firstChild, _el$227 = _el$226.nextSibling, _el$228 = _el$227.nextSibling, _el$229 = _el$228.nextSibling;
    insert(_el$227, createComponent(For, {
      each: worldCountryPaths,
      children: (country) => {
        const entry = () => props.countryById.get(country.id);
        return (() => {
          var _el$230 = getNextElement(_tmpl$35);
          _el$230.$$click = () => {
            const item = entry();
            if (!item) return;
            props.onActiveCountryChange(item.country);
          };
          _el$230.addEventListener("pointerenter", () => {
            const item = entry();
            if (!item) return;
            props.onActiveCountryChange(item.country);
          });
          createRenderEffect((_p$) => {
            var _v$49 = country.path, _v$50 = country.id, _v$51 = entry() ? "true" : void 0, _v$52 = entry()?.country === props.activeCountry ? "true" : void 0, _v$53 = {
              "--geo-country-opacity": String(countryOpacity(entry()))
            };
            _v$49 !== _p$.e && setAttribute(_el$230, "d", _p$.e = _v$49);
            _v$50 !== _p$.t && setAttribute(_el$230, "data-country-id", _p$.t = _v$50);
            _v$51 !== _p$.a && setAttribute(_el$230, "data-has-data", _p$.a = _v$51);
            _v$52 !== _p$.o && setAttribute(_el$230, "data-active", _p$.o = _v$52);
            _p$.i = style(_el$230, _v$53, _p$.i);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0,
            i: void 0
          });
          runHydrationEvents();
          return _el$230;
        })();
      }
    }));
    insert(_el$228, createComponent(For, {
      each: worldCountryPaths,
      children: (country) => {
        const entry = () => props.countryById.get(country.id);
        return createComponent(Show, {
          get when() {
            return memo(() => !!(country.marker && entry()))() ? country.marker : void 0;
          },
          children: (marker) => (() => {
            var _el$231 = getNextElement(_tmpl$36);
            _el$231.$$click = () => {
              const item = entry();
              if (!item) return;
              props.onActiveCountryChange(item.country);
            };
            _el$231.addEventListener("pointerenter", () => {
              const item = entry();
              if (!item) return;
              props.onActiveCountryChange(item.country);
            });
            createRenderEffect((_p$) => {
              var _v$54 = marker().x, _v$55 = marker().y, _v$56 = entry()?.country === props.activeCountry ? 3.4 : 2.4, _v$57 = entry()?.country === props.activeCountry ? "true" : void 0, _v$58 = {
                "--geo-country-opacity": String(countryOpacity(entry()))
              };
              _v$54 !== _p$.e && setAttribute(_el$231, "cx", _p$.e = _v$54);
              _v$55 !== _p$.t && setAttribute(_el$231, "cy", _p$.t = _v$55);
              _v$56 !== _p$.a && setAttribute(_el$231, "r", _p$.a = _v$56);
              _v$57 !== _p$.o && setAttribute(_el$231, "data-active", _p$.o = _v$57);
              _p$.i = style(_el$231, _v$58, _p$.i);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0
            });
            runHydrationEvents();
            return _el$231;
          })()
        });
      }
    }));
    setAttribute(_el$229, "d", worldBorderPath);
    return _el$225;
  })();
}
function GeoCountryList(props) {
  const opacityScale = createMemo(() => sqrt().domain([0, props.maxTokens]).range([0.26, 0.96]).clamp(true));
  return (() => {
    var _el$232 = getNextElement(_tmpl$37);
    insert(_el$232, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (country) => (() => {
        var _el$233 = getNextElement(_tmpl$38), _el$234 = _el$233.firstChild, _el$235 = _el$234.firstChild, _el$236 = _el$235.nextSibling, _el$237 = _el$236.nextSibling, _el$238 = _el$237.nextSibling, _el$239 = _el$238.nextSibling;
        _el$234.addEventListener("focus", () => props.onActiveCountryChange(country.country));
        _el$234.addEventListener("pointerenter", () => props.onActiveCountryChange(country.country));
        _el$234.$$click = () => props.onActiveCountryChange(country.country);
        insert(_el$235, () => String(country.rank).padStart(2, "0"));
        insert(_el$237, () => formatCountryName(country.country));
        insert(_el$238, () => formatGeoTokens(country.tokens));
        insert(_el$239, () => formatGeoShare(country.share));
        createRenderEffect((_p$) => {
          var _v$59 = props.activeCountry === country.country ? "true" : void 0, _v$60 = {
            "--geo-row-opacity": String(opacityScale()(country.tokens))
          }, _v$61 = `${formatCountryName(country.country)} ${formatGeoTokens(country.tokens)} ${formatGeoShare(country.share)}`;
          _v$59 !== _p$.e && setAttribute(_el$234, "data-active", _p$.e = _v$59);
          _p$.t = style(_el$234, _v$60, _p$.t);
          _v$61 !== _p$.a && setAttribute(_el$234, "aria-label", _p$.a = _v$61);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        runHydrationEvents();
        return _el$233;
      })()
    }));
    return _el$232;
  })();
}
function countryNumericId(country) {
  return countryNumericIds.get(country.toUpperCase())?.padStart(3, "0");
}
function geoCountryMarker(country) {
  const bounds = worldPath.bounds(country);
  const [x, y] = worldPath.centroid(country);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return void 0;
  if (bounds[1][0] - bounds[0][0] >= 3 && bounds[1][1] - bounds[0][1] >= 3) return void 0;
  return {
    x,
    y
  };
}
function formatCountryName(country) {
  const code = country.toUpperCase();
  if (code === "ZZ") return "Unknown";
  if (!countryNumericId(code)) return code;
  return countryDisplayNames.of(code) ?? code;
}
function formatGeoTokens(value) {
  if (value >= 1) return formatTrillions(value);
  if (value >= 1e-3) return `${Number((value * 1e3).toFixed(value >= 0.01 ? 0 : 1))}B`;
  return `${Math.round(value * 1e6)}M`;
}
function formatGeoShare(value) {
  return `${value.toFixed(value > 0 && value < 1 ? 1 : 0)}%`;
}
function getMarketSegmentColor(author, color, activeAuthor) {
  if (!activeAuthor) return color;
  if (activeAuthor === author) return color;
  return "var(--stats-bar-idle)";
}
function stackedMarketAuthors(day, order) {
  return day.authors.map((author, index) => ({
    author,
    index
  })).slice().sort((a, b) => (order.get(b.author.author) ?? b.index) - (order.get(a.author.author) ?? a.index));
}
function getMarketAuthorOrder(data) {
  return getRankOrder(data.flatMap((day) => day.authors.map((author, index) => ({
    key: author.author,
    value: author.tokens,
    index
  }))));
}
function getRankOrder(items) {
  return new Map(Object.values(items.reduce((result, item) => {
    result[item.key] = {
      key: item.key,
      value: (result[item.key]?.value ?? 0) + item.value,
      index: Math.min(result[item.key]?.index ?? item.index, item.index)
    };
    return result;
  }, {})).toSorted((a, b) => b.value - a.value || a.index - b.index || a.key.localeCompare(b.key)).map((item, index) => [item.key, index]));
}
function getRankColor(key, fallbackIndex, order, colors) {
  return colors[order.get(key) ?? fallbackIndex] ?? "var(--stats-text)";
}
function isMarketMobileLabelHidden(index, count) {
  return count > 7 && index % 2 === 1;
}
function formatMarketMobileDate(label) {
  return marketDateParts(label).start;
}
function formatTrillions(value) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}T`;
}
function formatMarketDate(day) {
  if (!day) return "No data";
  return formatMarketDateLabel(day.date);
}
function formatMarketRange(data) {
  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;
  if (!first || !last) return "No data";
  const start = marketDateParts(first).start;
  const end = marketDateParts(last).end;
  if (start === end) return formatMarketDateLabel(start);
  return `${start} ${(/* @__PURE__ */ new Date()).getFullYear()} → ${end} ${(/* @__PURE__ */ new Date()).getFullYear()}`;
}
function formatMarketDateLabel(label) {
  const parts = marketDateParts(label);
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  if (parts.start === parts.end) return `${parts.start} ${year}`;
  return `${parts.start} ${year} → ${parts.end} ${year}`;
}
function marketDateParts(label) {
  const [start, end] = label.split(" - ");
  return {
    start: start ?? label,
    end: end ?? start ?? label
  };
}
function TokenCostSection(props) {
  const [product, setProduct] = createSignal("Go");
  const [activeIndex, setActiveIndex] = createSignal(2);
  const data = createMemo(() => priceTokenCostFromCatalog(props.data[product()], props.catalog));
  const visible = createMemo(() => data().slice(0, 13));
  const selectedIndex = createMemo(() => Math.min(activeIndex(), Math.max(visible().length - 1, 0)));
  return (() => {
    var _el$240 = getNextElement(_tmpl$39), _el$246 = _el$240.firstChild, [_el$247, _co$56] = getNextMarker(_el$246.nextSibling), _el$248 = _el$247.nextSibling, [_el$249, _co$57] = getNextMarker(_el$248.nextSibling), _el$250 = _el$249.nextSibling, [_el$251, _co$58] = getNextMarker(_el$250.nextSibling), _el$241 = _el$251.nextSibling, _el$242 = _el$241.firstChild, [_el$243, _co$54] = getNextMarker(_el$242.nextSibling), _el$244 = _el$243.nextSibling, [_el$245, _co$55] = getNextMarker(_el$244.nextSibling);
    insert(_el$240, createComponent(SectionBridge, {
      label: "SESSION COST",
      href: "#session-cost"
    }), _el$247, _co$56);
    insert(_el$240, createComponent(SectionTitle, {
      title: "Token Cost",
      description: "Price per 1M tokens."
    }), _el$249, _co$57);
    insert(_el$240, createComponent(Show, {
      get when() {
        return visible().length > 0;
      },
      get fallback() {
        return createComponent(EmptyState, {
          title: "No token cost data",
          description: "No cost-bearing model_stat rows matched this product."
        });
      },
      get children() {
        return createComponent(TokenCostChart, {
          get data() {
            return visible();
          },
          get activeIndex() {
            return selectedIndex();
          },
          onActiveIndexChange: setActiveIndex
        });
      }
    }), _el$251, _co$58);
    insert(_el$241, createComponent(FilterPills, {
      items: tokenProducts,
      get selected() {
        return product();
      },
      label: "Product filter",
      variant: "product",
      onSelect: setProduct
    }), _el$243, _co$54);
    insert(_el$241, createComponent(LiveIndicator, {}), _el$245, _co$55);
    return _el$240;
  })();
}
function TokenCostChart(props) {
  const max = createMemo(() => Math.max(0, ...props.data.map((item) => item.total)) || 1);
  const active = createMemo(() => props.data[props.activeIndex] ?? props.data[0]);
  return (() => {
    var _el$252 = getNextElement(_tmpl$40), _el$253 = _el$252.firstChild, [_el$254, _co$59] = getNextMarker(_el$253.nextSibling), _el$255 = _el$254.nextSibling, [_el$256, _co$60] = getNextMarker(_el$255.nextSibling);
    insert(_el$252, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (item, index) => (() => {
        var _el$257 = getNextElement(_tmpl$41), _el$258 = _el$257.firstChild, _el$259 = _el$258.nextSibling, _el$260 = _el$259.nextSibling, [_el$261, _co$61] = getNextMarker(_el$260.nextSibling);
        _el$257.addEventListener("pointerenter", () => props.onActiveIndexChange(index()));
        _el$257.$$click = () => props.onActiveIndexChange(index());
        insert(_el$258, () => formatDollars(item.total));
        insert(_el$259, () => item.model);
        insert(_el$257, createComponent(MetricBar, {
          get value() {
            return item.total;
          },
          get max() {
            return max();
          },
          get active() {
            return props.activeIndex === index();
          }
        }), _el$261, _co$61);
        createRenderEffect(() => setAttribute(_el$257, "data-active", props.activeIndex === index() ? "true" : void 0));
        runHydrationEvents();
        return _el$257;
      })()
    }), _el$254, _co$59);
    insert(_el$252, createComponent(Show, {
      get when() {
        return active();
      },
      children: (item) => (() => {
        var _el$262 = getNextElement(_tmpl$42), _el$263 = _el$262.firstChild, _el$264 = _el$263.firstChild, _el$265 = _el$264.nextSibling, _el$266 = _el$263.nextSibling, _el$267 = _el$266.firstChild, _el$268 = _el$267.nextSibling, _el$269 = _el$266.nextSibling, _el$270 = _el$269.firstChild, _el$271 = _el$270.nextSibling;
        insert(_el$265, () => formatDollars(item().input));
        insert(_el$268, () => formatDollars(item().output));
        insert(_el$271, () => formatDollars(item().cached));
        createRenderEffect((_$p) => setStyleProperty(_el$262, "top", `${props.activeIndex * 36 + 2}px`));
        return _el$262;
      })()
    }), _el$256, _co$60);
    return _el$252;
  })();
}
function CacheRatioSection(props) {
  const [product, setProduct] = createSignal("Go");
  const [activeIndex, setActiveIndex] = createSignal(2);
  const data = createMemo(() => props.data[product()]);
  const visible = createMemo(() => data().slice(0, 16));
  const selectedIndex = createMemo(() => Math.min(activeIndex(), Math.max(visible().length - 1, 0)));
  return (() => {
    var _el$272 = getNextElement(_tmpl$43), _el$278 = _el$272.firstChild, [_el$279, _co$64] = getNextMarker(_el$278.nextSibling), _el$280 = _el$279.nextSibling, [_el$281, _co$65] = getNextMarker(_el$280.nextSibling), _el$282 = _el$281.nextSibling, [_el$283, _co$66] = getNextMarker(_el$282.nextSibling), _el$273 = _el$283.nextSibling, _el$274 = _el$273.firstChild, [_el$275, _co$62] = getNextMarker(_el$274.nextSibling), _el$276 = _el$275.nextSibling, [_el$277, _co$63] = getNextMarker(_el$276.nextSibling);
    insert(_el$272, createComponent(SectionBridge, {
      label: "TOKEN COST",
      href: "#token-cost"
    }), _el$279, _co$64);
    insert(_el$272, createComponent(SectionTitle, {
      title: "Cache Ratio",
      description: "Share of input tokens served from cache."
    }), _el$281, _co$65);
    insert(_el$272, createComponent(Show, {
      get when() {
        return visible().length > 0;
      },
      get fallback() {
        return createComponent(EmptyState, {
          title: "No cache ratio data",
          description: "No input-token model_stat rows matched this product."
        });
      },
      get children() {
        return createComponent(CacheRatioChart, {
          get data() {
            return visible();
          },
          get activeIndex() {
            return selectedIndex();
          },
          onActiveIndexChange: setActiveIndex
        });
      }
    }), _el$283, _co$66);
    insert(_el$273, createComponent(FilterPills, {
      items: tokenProducts,
      get selected() {
        return product();
      },
      label: "Product filter",
      variant: "product",
      onSelect: setProduct
    }), _el$275, _co$62);
    insert(_el$273, createComponent(LiveIndicator, {}), _el$277, _co$63);
    return _el$272;
  })();
}
function CacheRatioChart(props) {
  const active = createMemo(() => props.data[props.activeIndex] ?? props.data[0]);
  return (() => {
    var _el$284 = getNextElement(_tmpl$44), _el$285 = _el$284.firstChild, _el$286 = _el$285.nextSibling, _el$287 = _el$286.nextSibling, [_el$288, _co$67] = getNextMarker(_el$287.nextSibling);
    insert(_el$286, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (item, index) => (() => {
        var _el$289 = getNextElement(_tmpl$45), _el$290 = _el$289.firstChild, _el$291 = _el$290.nextSibling, _el$292 = _el$291.nextSibling, [_el$293, _co$68] = getNextMarker(_el$292.nextSibling);
        _el$289.addEventListener("pointerenter", () => props.onActiveIndexChange(index()));
        _el$289.$$click = () => props.onActiveIndexChange(index());
        insert(_el$290, () => formatRatio(item.ratio));
        insert(_el$291, () => item.model);
        insert(_el$289, createComponent(CacheRatioMarker, {
          get ratio() {
            return item.ratio;
          },
          get active() {
            return props.activeIndex === index();
          }
        }), _el$293, _co$68);
        createRenderEffect(() => setAttribute(_el$289, "data-active", props.activeIndex === index() ? "true" : void 0));
        runHydrationEvents();
        return _el$289;
      })()
    }));
    insert(_el$284, createComponent(Show, {
      get when() {
        return active();
      },
      children: (item) => (() => {
        var _el$294 = getNextElement(_tmpl$46), _el$295 = _el$294.firstChild, _el$296 = _el$295.firstChild, _el$297 = _el$296.nextSibling, _el$298 = _el$295.nextSibling, _el$299 = _el$298.firstChild, _el$300 = _el$299.nextSibling, _el$301 = _el$298.nextSibling, _el$302 = _el$301.firstChild, _el$303 = _el$302.nextSibling;
        insert(_el$297, () => formatRatio(item().ratio));
        insert(_el$300, () => formatBillions(item().cached));
        insert(_el$303, () => formatBillions(item().uncached));
        createRenderEffect((_$p) => setStyleProperty(_el$294, "top", `${props.activeIndex * 36 + 28}px`));
        return _el$294;
      })()
    }), _el$288, _co$67);
    return _el$284;
  })();
}
function CacheRatioMarker(props) {
  const fill = createMemo(() => Math.min(100, Math.max(0, props.ratio)));
  return (() => {
    var _el$304 = getNextElement(_tmpl$47);
    createRenderEffect((_p$) => {
      var _v$62 = props.active ? "true" : void 0, _v$63 = {
        "--cache-ratio-fill": `${fill()}%`
      };
      _v$62 !== _p$.e && setAttribute(_el$304, "data-active", _p$.e = _v$62);
      _p$.t = style(_el$304, _v$63, _p$.t);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$304;
  })();
}
function formatRatio(value) {
  return `${value.toFixed(value > 0 && value < 10 ? 1 : 0)}%`;
}
function formatDollars(value) {
  return `$${value.toFixed(value > 0 && value < 0.01 ? 4 : 2)}`;
}
function MetricBar(props) {
  const fill = createMemo(() => Math.min(1, Math.max(props.value / props.max, props.value > 0 ? 0.03 : 0)));
  return (() => {
    var _el$305 = getNextElement(_tmpl$48);
    createRenderEffect((_p$) => {
      var _v$64 = props.active ? "true" : void 0, _v$65 = {
        "--metric-bar-fill": `${fill() * 100}%`
      };
      _v$64 !== _p$.e && setAttribute(_el$305, "data-active", _p$.e = _v$64);
      _p$.t = style(_el$305, _v$65, _p$.t);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$305;
  })();
}
function SessionCostSection(props) {
  const [product, setProduct] = createSignal("Go");
  const [activeIndex, setActiveIndex] = createSignal(2);
  const data = createMemo(() => props.data[product()]);
  const visible = createMemo(() => data().slice(0, 16));
  const selectedIndex = createMemo(() => Math.min(activeIndex(), Math.max(visible().length - 1, 0)));
  return (() => {
    var _el$306 = getNextElement(_tmpl$49), _el$312 = _el$306.firstChild, [_el$313, _co$71] = getNextMarker(_el$312.nextSibling), _el$314 = _el$313.nextSibling, [_el$315, _co$72] = getNextMarker(_el$314.nextSibling), _el$316 = _el$315.nextSibling, [_el$317, _co$73] = getNextMarker(_el$316.nextSibling), _el$307 = _el$317.nextSibling, _el$308 = _el$307.firstChild, [_el$309, _co$69] = getNextMarker(_el$308.nextSibling), _el$310 = _el$309.nextSibling, [_el$311, _co$70] = getNextMarker(_el$310.nextSibling);
    insert(_el$306, createComponent(SectionBridge, {
      label: "TOP MODELS",
      href: "#top-models"
    }), _el$313, _co$71);
    insert(_el$306, createComponent(SectionTitle, {
      title: "Session Cost",
      description: "Average cost per session."
    }), _el$315, _co$72);
    insert(_el$306, createComponent(Show, {
      get when() {
        return visible().length > 0;
      },
      get fallback() {
        return createComponent(EmptyState, {
          title: "No session cost data",
          description: "No session-bearing model_stat rows matched this product."
        });
      },
      get children() {
        return createComponent(SessionCostChart, {
          get data() {
            return visible();
          },
          get activeIndex() {
            return selectedIndex();
          },
          onActiveIndexChange: setActiveIndex
        });
      }
    }), _el$317, _co$73);
    insert(_el$307, createComponent(FilterPills, {
      items: tokenProducts,
      get selected() {
        return product();
      },
      label: "Product filter",
      variant: "product",
      onSelect: setProduct
    }), _el$309, _co$69);
    insert(_el$307, createComponent(LiveIndicator, {}), _el$311, _co$70);
    return _el$306;
  })();
}
function SessionCostChart(props) {
  const maxCost = createMemo(() => Math.max(0, ...props.data.map((item) => item.cost)) || 1);
  const maxTokens = createMemo(() => Math.max(0, ...props.data.map((item) => item.tokens)) || 1);
  const active = createMemo(() => props.data[props.activeIndex] ?? props.data[0]);
  return (() => {
    var _el$318 = getNextElement(_tmpl$50), _el$319 = _el$318.firstChild, _el$320 = _el$319.nextSibling, [_el$321, _co$74] = getNextMarker(_el$320.nextSibling), _el$322 = _el$321.nextSibling, [_el$323, _co$75] = getNextMarker(_el$322.nextSibling);
    insert(_el$318, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (item, index) => (() => {
        var _el$324 = getNextElement(_tmpl$51), _el$325 = _el$324.firstChild, _el$326 = _el$325.nextSibling, _el$327 = _el$326.nextSibling, [_el$328, _co$76] = getNextMarker(_el$327.nextSibling), _el$329 = _el$328.nextSibling, [_el$330, _co$77] = getNextMarker(_el$329.nextSibling);
        _el$324.addEventListener("pointerenter", () => props.onActiveIndexChange(index()));
        _el$324.$$click = () => props.onActiveIndexChange(index());
        insert(_el$325, () => formatSessionCost(item.cost));
        insert(_el$326, () => item.model);
        insert(_el$324, createComponent(MetricBar, {
          get value() {
            return item.cost;
          },
          get max() {
            return maxCost();
          },
          get active() {
            return props.activeIndex === index();
          }
        }), _el$328, _co$76);
        insert(_el$324, createComponent(MetricBar, {
          get value() {
            return item.tokens;
          },
          get max() {
            return maxTokens();
          },
          get active() {
            return props.activeIndex === index();
          }
        }), _el$330, _co$77);
        createRenderEffect(() => setAttribute(_el$324, "data-active", props.activeIndex === index() ? "true" : void 0));
        runHydrationEvents();
        return _el$324;
      })()
    }), _el$321, _co$74);
    insert(_el$318, createComponent(Show, {
      get when() {
        return active();
      },
      children: (item) => (() => {
        var _el$331 = getNextElement(_tmpl$52), _el$332 = _el$331.firstChild, _el$333 = _el$332.firstChild, _el$334 = _el$333.nextSibling, _el$335 = _el$332.nextSibling, _el$336 = _el$335.firstChild, _el$337 = _el$336.nextSibling;
        insert(_el$334, () => formatSessionCost(item().cost));
        insert(_el$337, () => formatTokenCount(item().tokens));
        createRenderEffect((_$p) => setStyleProperty(_el$331, "top", `${props.activeIndex * 36 + 28}px`));
        return _el$331;
      })()
    }), _el$323, _co$75);
    return _el$318;
  })();
}
function LiveIndicator() {
  return getNextElement(_tmpl$53);
}
function formatTokenCount(value) {
  if (value >= 1e6) return `${Number((value / 1e6).toFixed(1))}M`;
  return `${Math.round(value / 1e3)}K`;
}
function priceTokenCostFromCatalog(data, catalog) {
  if (!catalog) return data;
  return data.flatMap((item) => {
    const cost = catalogModelCost(catalog, item.model);
    if (!cost) return [];
    return [{
      ...item,
      total: cost.output,
      input: cost.input,
      output: cost.output,
      cached: cost.cacheRead ?? cost.input
    }];
  }).toSorted((a, b) => a.total - b.total || a.model.localeCompare(b.model));
}
function catalogModelCost(catalog, model) {
  return findModelCatalogEntry(catalog, model)?.cost;
}
function formatSessionCost(value) {
  return `$${value.toFixed(4)}`;
}
function modelSlug(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}
delegateEvents(["click", "pointerdown", "pointermove", "keydown"]);
export {
  StatsHome as default
};
