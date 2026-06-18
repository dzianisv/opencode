import { a4 as useParams, k as createMemo, q as createSignal, N as onMount, v as getNextElement, w as getNextMarker, z as insert, i as createComponent, l as createRenderEffect, a0 as template, r as delegateEvents, T as Title, M as Meta, L as Link, S as Show, Q as setAttribute, D as memo, F as For, $ as style, O as runHydrationEvents } from "./routing--lmSOy1r.js";
import { c as createAsync, b as createServerReference, q as query, h as getModelCatalog, f as findModelCatalogEntry, g as getGitHubStars, e as formatCatalogLabName, t as themeStorageKey, a as applyThemePreference, j as isThemePreference, H as Header, F as Footer } from "./stats-shell-CsMXs3yn.js";
import { a as countryCodesSource, c as countriesTopologySource, f as feature, g as geoEquirectangular, b as geoPath, m as mesh, P as ProviderIcon, s as sqrt } from "./countries-50m-AdHQYOKv.js";
var _tmpl$ = /* @__PURE__ */ template(`<main data-page=stats><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><div data-component=container><div data-component=content></div><!$><!/>`), _tmpl$2 = /* @__PURE__ */ template(`<section id=overview data-section=model-hero><div data-slot=model-hero-grid><div data-slot=model-hero-copy><a data-slot=model-back-link>Data</a><h1>Model Data</h1><p>Reading model aggregates from model_stat.`), _tmpl$3 = /* @__PURE__ */ template(`<section data-section=model-panel>`), _tmpl$4 = /* @__PURE__ */ template(`<section id=overview data-section=model-hero><div data-slot=model-hero-grid><div data-slot=model-hero-copy><a data-slot=model-back-link>Data</a><h1></h1><p>No model facts or model_stat rows matched <!$><!/>.`), _tmpl$5 = /* @__PURE__ */ template(`<section id=overview data-section=model-hero><a data-slot=model-back-link>Data</a><div data-slot=model-hero-grid><div data-slot=model-hero-copy><div data-slot=model-hero-tags><a data-slot=hero-meta><!$><!/><span></span></a><span data-slot=model-id-tag></span></div><h1></h1><!$><!/><!$><!/></div><!$><!/></div><div data-slot=model-hero-pattern aria-hidden=true></div><!$><!/>`), _tmpl$6 = /* @__PURE__ */ template(`<p>Model facts from the shared model index. OpenCode usage appears once this model has activity.`), _tmpl$7 = /* @__PURE__ */ template(`<p><!$><!/> with <!$><!/> of observed 2M volume.`), _tmpl$8 = /* @__PURE__ */ template(`<a data-slot=model-weight-link target=_blank rel="noopener noreferrer">Model weights: <!$><!/>`), _tmpl$9 = /* @__PURE__ */ template(`<div data-component=model-rank-panel><span>7D Rank</span><strong></strong><p>`), _tmpl$0 = /* @__PURE__ */ template(`<div data-component=model-rank-panel><span>Model Profile</span><strong></strong><p>No OpenCode usage in the current data window.`), _tmpl$1 = /* @__PURE__ */ template(`<aside data-component=model-catalog aria-label="Model facts"><div data-slot=model-catalog-grid><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/>`), _tmpl$10 = /* @__PURE__ */ template(`<article data-component=model-catalog-datum><span></span><strong>`), _tmpl$11 = /* @__PURE__ */ template(`<section data-section=model-panel><!$><!/><!$><!/>`), _tmpl$12 = /* @__PURE__ */ template(`<div data-component=model-metric-grid><!$><!/><!$><!/><!$><!/><!$><!/>`), _tmpl$13 = /* @__PURE__ */ template(`<div data-component=model-usage-chart role=img aria-label="Daily token usage chart"><div data-slot=model-usage-axis aria-hidden=true></div><div data-slot=model-usage-bars>`), _tmpl$14 = /* @__PURE__ */ template(`<section id=usage data-section=model-panel><!$><!/><!$><!/>`), _tmpl$15 = /* @__PURE__ */ template(`<div><span data-slot=model-usage-label><span data-slot=model-usage-total></span><span data-slot=model-usage-date>`), _tmpl$16 = /* @__PURE__ */ template(`<div data-slot=model-usage-column role=button tabindex=0><div data-slot=model-usage-bar></div><!$><!/>`), _tmpl$17 = /* @__PURE__ */ template(`<div data-component=chart-tooltip><strong></strong><span><!$><!/> tokens</span><div data-slot=tooltip-divider></div><p><span data-slot=tooltip-label><i></i> Daily tokens</span><b>`), _tmpl$18 = /* @__PURE__ */ template(`<section id=efficiency data-section=model-panel><!$><!/><!$><!/>`), _tmpl$19 = /* @__PURE__ */ template(`<div data-component=model-metric-grid data-variant=dense><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/>`), _tmpl$20 = /* @__PURE__ */ template(`<div data-component=geo-breakdown><div data-slot=geo-map-panel><!$><!/><!$><!/></div><!$><!/>`), _tmpl$21 = /* @__PURE__ */ template(`<section id=geo-breakdown data-section=geo-breakdown><!$><!/><!$><!/>`), _tmpl$22 = /* @__PURE__ */ template(`<div data-slot=geo-active-country><span>#<!$><!/></span><strong></strong><p><b></b><em>`), _tmpl$23 = /* @__PURE__ */ template(`<svg data-component=geo-world-map viewBox="0 0 960 430"role=img aria-label="World map of model token usage by country"><title>Geo Breakdown map</title><g data-slot=geo-countries></g><g data-slot=geo-country-markers></g><path data-slot=geo-borders aria-hidden=true>`), _tmpl$24 = /* @__PURE__ */ template(`<svg><path aria-hidden=true></svg>`, false, true, false), _tmpl$25 = /* @__PURE__ */ template(`<svg><circle aria-hidden=true></svg>`, false, true, false), _tmpl$26 = /* @__PURE__ */ template(`<ol data-component=geo-country-list>`), _tmpl$27 = /* @__PURE__ */ template(`<li><button type=button><span></span><i></i><strong></strong><em></em><b>`), _tmpl$28 = /* @__PURE__ */ template(`<ol data-component=model-peer-list>`), _tmpl$29 = /* @__PURE__ */ template(`<section id=peers data-section=model-panel><!$><!/><!$><!/>`), _tmpl$30 = /* @__PURE__ */ template(`<article data-component=model-metric><span></span><strong></strong><p>`), _tmpl$31 = /* @__PURE__ */ template(`<li><a><span></span><!$><!/><strong></strong><em></em><b>`), _tmpl$32 = /* @__PURE__ */ template(`<p data-slot=section-title><strong><!$><!/>.</strong> <span>`), _tmpl$33 = /* @__PURE__ */ template(`<div data-component=empty-state><strong></strong><p>`);
const statsCanonicalBaseUrl = "https://opencode.ai/data/";
const statsUnfurlPath = "banner.png";
const statsUnfurlAlt = "OpenCode Data wordmark on a dark patterned background";
const statsUnfurlUrl = new URL(statsUnfurlPath, statsCanonicalBaseUrl).toString();
const modelHeaderLinks = [{
  href: "#overview",
  label: "Overview"
}, {
  href: "#usage",
  label: "Usage"
}, {
  href: "#efficiency",
  label: "Efficiency"
}, {
  href: "#geo-breakdown",
  label: "Geo Breakdown"
}, {
  href: "#peers",
  label: "Peers"
}];
const modelFooterLinks = [{
  href: "/data/",
  label: "Data Home"
}, {
  href: `${"/data/"}#top-models`,
  label: "Top Models"
}, {
  href: `${"/data/"}#leaderboard`,
  label: "Leaderboard"
}, {
  href: `${"/data/"}#session-cost`,
  label: "Session Cost"
}, {
  href: `${"/data/"}#token-cost`,
  label: "Token Cost"
}, {
  href: `${"/data/"}#market-share`,
  label: "Market Share"
}, {
  href: `${"/data/"}#geo-breakdown`,
  label: "Geo Breakdown"
}];
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
const getModelData_query = createServerReference("860922e9029e84bcdbdc5deeca55736744445ef460cfd780ceafcdb8b417cb55");
const getModelData = query(getModelData_query, "getStatsModelData");
function StatsModel() {
  const params = useParams();
  const labParam = createMemo(() => params.lab ?? "");
  const modelParam = createMemo(() => params.model ?? "");
  const catalog = createAsync(() => getModelCatalog());
  const catalogEntry = createMemo(() => {
    const data = catalog();
    if (!data) return void 0;
    return findModelCatalogEntry(data, modelParam(), labParam()) ?? null;
  });
  const stats = createAsync(() => {
    const entry = catalogEntry();
    if (catalog() === void 0 || entry === void 0) return Promise.resolve(void 0);
    if (!entry && (!labParam() || !modelParam())) return Promise.resolve(null);
    return getModelData(labParam(), entry?.slug ?? modelParam());
  });
  const githubStars = createAsync(() => getGitHubStars());
  const [themePreference, setThemePreference] = createSignal("system");
  const modelName = createMemo(() => catalogEntry()?.name ?? stats()?.model ?? modelParam() ?? "Model");
  const labName = createMemo(() => formatCatalogLabName(catalogEntry()?.lab ?? stats()?.provider ?? labParam()));
  const modelTitle = createMemo(() => `${modelName()} Data`);
  const modelDescription = createMemo(() => stats() ? `${modelName()} usage, rank, token mix, cost, geo breakdown, and peer data across OpenCode.` : `${modelName()} model facts, limits, and OpenCode usage availability.`);
  const modelUrl = createMemo(() => new URL(catalogEntry()?.id ?? [labParam(), stats()?.slug ?? modelParam()].filter((part) => part.length > 0).join("/"), statsCanonicalBaseUrl).toString());
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
    var _el$ = getNextElement(_tmpl$), _el$6 = _el$.firstChild, [_el$7, _co$2] = getNextMarker(_el$6.nextSibling), _el$8 = _el$7.nextSibling, [_el$9, _co$3] = getNextMarker(_el$8.nextSibling), _el$0 = _el$9.nextSibling, [_el$1, _co$4] = getNextMarker(_el$0.nextSibling), _el$10 = _el$1.nextSibling, [_el$11, _co$5] = getNextMarker(_el$10.nextSibling), _el$12 = _el$11.nextSibling, [_el$13, _co$6] = getNextMarker(_el$12.nextSibling), _el$14 = _el$13.nextSibling, [_el$15, _co$7] = getNextMarker(_el$14.nextSibling), _el$16 = _el$15.nextSibling, [_el$17, _co$8] = getNextMarker(_el$16.nextSibling), _el$18 = _el$17.nextSibling, [_el$19, _co$9] = getNextMarker(_el$18.nextSibling), _el$20 = _el$19.nextSibling, [_el$21, _co$0] = getNextMarker(_el$20.nextSibling), _el$22 = _el$21.nextSibling, [_el$23, _co$1] = getNextMarker(_el$22.nextSibling), _el$24 = _el$23.nextSibling, [_el$25, _co$10] = getNextMarker(_el$24.nextSibling), _el$26 = _el$25.nextSibling, [_el$27, _co$11] = getNextMarker(_el$26.nextSibling), _el$28 = _el$27.nextSibling, [_el$29, _co$12] = getNextMarker(_el$28.nextSibling), _el$30 = _el$29.nextSibling, [_el$31, _co$13] = getNextMarker(_el$30.nextSibling), _el$32 = _el$31.nextSibling, [_el$33, _co$14] = getNextMarker(_el$32.nextSibling), _el$34 = _el$33.nextSibling, [_el$35, _co$15] = getNextMarker(_el$34.nextSibling), _el$36 = _el$35.nextSibling, [_el$37, _co$16] = getNextMarker(_el$36.nextSibling), _el$38 = _el$37.nextSibling, [_el$39, _co$17] = getNextMarker(_el$38.nextSibling), _el$40 = _el$39.nextSibling, [_el$41, _co$18] = getNextMarker(_el$40.nextSibling), _el$2 = _el$41.nextSibling, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, [_el$5, _co$] = getNextMarker(_el$4.nextSibling);
    insert(_el$, createComponent(Title, {
      get children() {
        return modelTitle();
      }
    }), _el$7, _co$2);
    insert(_el$, createComponent(Meta, {
      name: "description",
      get content() {
        return modelDescription();
      }
    }), _el$9, _co$3);
    insert(_el$, createComponent(Link, {
      rel: "canonical",
      get href() {
        return modelUrl();
      }
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
      get content() {
        return modelTitle();
      }
    }), _el$15, _co$7);
    insert(_el$, createComponent(Meta, {
      property: "og:description",
      get content() {
        return modelDescription();
      }
    }), _el$17, _co$8);
    insert(_el$, createComponent(Meta, {
      property: "og:url",
      get content() {
        return modelUrl();
      }
    }), _el$19, _co$9);
    insert(_el$, createComponent(Meta, {
      property: "og:image",
      content: statsUnfurlUrl
    }), _el$21, _co$0);
    insert(_el$, createComponent(Meta, {
      property: "og:image:type",
      content: "image/png"
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
      get content() {
        return modelTitle();
      }
    }), _el$33, _co$14);
    insert(_el$, createComponent(Meta, {
      name: "twitter:description",
      get content() {
        return modelDescription();
      }
    }), _el$35, _co$15);
    insert(_el$, createComponent(Meta, {
      name: "twitter:image",
      content: statsUnfurlUrl
    }), _el$37, _co$16);
    insert(_el$, createComponent(Meta, {
      name: "twitter:image:alt",
      content: statsUnfurlAlt
    }), _el$39, _co$17);
    insert(_el$, createComponent(Header, {
      get githubStars() {
        return githubStars() ?? "150K";
      },
      links: modelHeaderLinks,
      get brandHref() {
        return "/data/";
      }
    }), _el$41, _co$18);
    insert(_el$3, createComponent(Show, {
      get when() {
        return catalogEntry() || stats() !== void 0;
      },
      get fallback() {
        return createComponent(ModelLoading, {});
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return catalogEntry() || stats();
          },
          get fallback() {
            return createComponent(ModelNotFound, {
              get lab() {
                return labParam();
              },
              get model() {
                return modelParam();
              }
            });
          },
          get children() {
            return [createComponent(ModelHero, {
              get data() {
                return stats() ?? null;
              },
              get catalog() {
                return catalogEntry() ?? null;
              },
              get labName() {
                return labName();
              }
            }), createComponent(ModelOverview, {
              get data() {
                return stats() ?? null;
              }
            }), createComponent(ModelUsageSection, {
              get data() {
                return stats()?.usage ?? [];
              }
            }), createComponent(ModelEfficiencySection, {
              get data() {
                return stats() ?? null;
              },
              get catalog() {
                return catalogEntry() ?? null;
              }
            }), createComponent(ModelGeoBreakdownSection, {
              get data() {
                return stats()?.country ?? emptyCountryRecord();
              }
            }), createComponent(ModelPeersSection, {
              get data() {
                return stats() ?? null;
              }
            })];
          }
        });
      }
    }));
    insert(_el$2, createComponent(Footer, {
      get themePreference() {
        return themePreference();
      },
      onThemePreferenceChange: updateThemePreference,
      links: modelFooterLinks
    }), _el$5, _co$);
    createRenderEffect(() => setAttribute(_el$, "data-theme", themePreference()));
    return _el$;
  })();
}
function ModelLoading() {
  return [(() => {
    var _el$42 = getNextElement(_tmpl$2), _el$43 = _el$42.firstChild, _el$44 = _el$43.firstChild, _el$45 = _el$44.firstChild;
    createRenderEffect(() => setAttribute(_el$45, "href", "/data/"));
    return _el$42;
  })(), (() => {
    var _el$46 = getNextElement(_tmpl$3);
    insert(_el$46, createComponent(ModelEmptyState, {
      title: "Loading model data",
      description: "Reading the model profile."
    }));
    return _el$46;
  })()];
}
function ModelNotFound(props) {
  return [(() => {
    var _el$47 = getNextElement(_tmpl$4), _el$48 = _el$47.firstChild, _el$49 = _el$48.firstChild, _el$50 = _el$49.firstChild, _el$51 = _el$50.nextSibling, _el$52 = _el$51.nextSibling, _el$53 = _el$52.firstChild, _el$55 = _el$53.nextSibling, [_el$56, _co$19] = getNextMarker(_el$55.nextSibling);
    _el$56.nextSibling;
    insert(_el$51, () => props.model || "Model");
    insert(_el$52, (() => {
      var _c$ = memo(() => !!props.lab);
      return () => _c$() ? `${props.lab}/${props.model}` : props.model;
    })(), _el$56, _co$19);
    createRenderEffect(() => setAttribute(_el$50, "href", "/data/"));
    return _el$47;
  })(), (() => {
    var _el$57 = getNextElement(_tmpl$3);
    insert(_el$57, createComponent(ModelEmptyState, {
      title: "No model data",
      description: "Try opening a model from the leaderboard."
    }));
    return _el$57;
  })()];
}
function ModelHero(props) {
  const labId = () => props.catalog?.lab ?? props.data?.provider ?? props.labName;
  const modelId = () => props.catalog?.id ?? props.data?.model ?? "Model";
  const weights = () => props.catalog?.weights[0];
  return (() => {
    var _el$58 = getNextElement(_tmpl$5), _el$59 = _el$58.firstChild, _el$60 = _el$59.nextSibling, _el$61 = _el$60.firstChild, _el$62 = _el$61.firstChild, _el$63 = _el$62.firstChild, _el$65 = _el$63.firstChild, [_el$66, _co$20] = getNextMarker(_el$65.nextSibling), _el$64 = _el$66.nextSibling, _el$67 = _el$63.nextSibling, _el$68 = _el$62.nextSibling, _el$69 = _el$68.nextSibling, [_el$70, _co$21] = getNextMarker(_el$69.nextSibling), _el$71 = _el$70.nextSibling, [_el$72, _co$22] = getNextMarker(_el$71.nextSibling), _el$73 = _el$61.nextSibling, [_el$74, _co$23] = getNextMarker(_el$73.nextSibling), _el$75 = _el$60.nextSibling, _el$76 = _el$75.nextSibling, [_el$77, _co$24] = getNextMarker(_el$76.nextSibling);
    insert(_el$63, createComponent(ProviderIcon, {
      "aria-hidden": "true",
      get id() {
        return getProviderIconId(labId());
      }
    }), _el$66, _co$20);
    insert(_el$64, () => props.labName);
    insert(_el$67, modelId);
    insert(_el$68, () => props.catalog?.name ?? props.data?.model ?? "Model");
    insert(_el$61, createComponent(Show, {
      get when() {
        return props.data;
      },
      get fallback() {
        return getNextElement(_tmpl$6);
      },
      children: (data) => (() => {
        var _el$79 = getNextElement(_tmpl$7), _el$83 = _el$79.firstChild, [_el$84, _co$25] = getNextMarker(_el$83.nextSibling), _el$80 = _el$84.nextSibling, _el$85 = _el$80.nextSibling, [_el$86, _co$26] = getNextMarker(_el$85.nextSibling);
        _el$86.nextSibling;
        insert(_el$79, (() => {
          var _c$2 = memo(() => data().rank === null);
          return () => _c$2() ? "Unranked across last week's OpenCode Go usage" : `Ranked #${data().rank} across last week's OpenCode Go usage`;
        })(), _el$84, _co$25);
        insert(_el$79, () => formatPercent(data().tokenShare), _el$86, _co$26);
        return _el$79;
      })()
    }), _el$70, _co$21);
    insert(_el$61, createComponent(Show, {
      get when() {
        return memo(() => !!props.catalog?.openWeights)() && weights();
      },
      children: (weight) => (() => {
        var _el$87 = getNextElement(_tmpl$8), _el$88 = _el$87.firstChild, _el$89 = _el$88.nextSibling, [_el$90, _co$27] = getNextMarker(_el$89.nextSibling);
        insert(_el$87, () => weight().label, _el$90, _co$27);
        createRenderEffect(() => setAttribute(_el$87, "href", weight().url));
        return _el$87;
      })()
    }), _el$72, _co$22);
    insert(_el$60, createComponent(Show, {
      get when() {
        return props.data;
      },
      get fallback() {
        return createComponent(ModelCatalogCallout, {
          get catalog() {
            return props.catalog;
          }
        });
      },
      children: (data) => (() => {
        var _el$91 = getNextElement(_tmpl$9), _el$92 = _el$91.firstChild, _el$93 = _el$92.nextSibling, _el$94 = _el$93.nextSibling;
        insert(_el$93, (() => {
          var _c$3 = memo(() => data().rank === null);
          return () => _c$3() ? "—" : `#${data().rank}`;
        })());
        insert(_el$94, () => formatModelRankMoveLabel(data()));
        return _el$91;
      })()
    }), _el$74, _co$23);
    insert(_el$58, createComponent(Show, {
      get when() {
        return props.catalog;
      },
      children: (catalog) => createComponent(ModelCatalogPanel, {
        get data() {
          return catalog();
        }
      })
    }), _el$77, _co$24);
    createRenderEffect((_p$) => {
      var _v$ = "/data/", _v$2 = `${"/data/"}${providerSlug(labId())}`;
      _v$ !== _p$.e && setAttribute(_el$59, "href", _p$.e = _v$);
      _v$2 !== _p$.t && setAttribute(_el$63, "href", _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$58;
  })();
}
function ModelCatalogCallout(props) {
  return (() => {
    var _el$95 = getNextElement(_tmpl$0), _el$96 = _el$95.firstChild, _el$97 = _el$96.nextSibling;
    insert(_el$97, (() => {
      var _c$4 = memo(() => !!props.catalog?.releaseDate);
      return () => _c$4() ? formatCatalogDate(props.catalog.releaseDate) : "Listed";
    })());
    return _el$95;
  })();
}
function ModelCatalogPanel(props) {
  return (() => {
    var _el$98 = getNextElement(_tmpl$1), _el$99 = _el$98.firstChild, _el$100 = _el$99.firstChild, [_el$101, _co$28] = getNextMarker(_el$100.nextSibling), _el$102 = _el$101.nextSibling, [_el$103, _co$29] = getNextMarker(_el$102.nextSibling), _el$104 = _el$103.nextSibling, [_el$105, _co$30] = getNextMarker(_el$104.nextSibling), _el$106 = _el$105.nextSibling, [_el$107, _co$31] = getNextMarker(_el$106.nextSibling), _el$108 = _el$107.nextSibling, [_el$109, _co$32] = getNextMarker(_el$108.nextSibling);
    insert(_el$99, createComponent(CatalogDatum, {
      label: "Context",
      get value() {
        return formatCatalogLimit(props.data.limit?.context);
      }
    }), _el$101, _co$28);
    insert(_el$99, createComponent(CatalogDatum, {
      label: "Output",
      get value() {
        return formatCatalogLimit(props.data.limit?.output);
      }
    }), _el$103, _co$29);
    insert(_el$99, createComponent(CatalogDatum, {
      label: "Knowledge",
      get value() {
        return formatCatalogDate(props.data.knowledge);
      }
    }), _el$105, _co$30);
    insert(_el$99, createComponent(CatalogDatum, {
      label: "Release",
      get value() {
        return formatCatalogDate(props.data.releaseDate);
      }
    }), _el$107, _co$31);
    insert(_el$99, createComponent(CatalogDatum, {
      label: "Inputs",
      get value() {
        return formatCatalogModalities(props.data.modalities.input);
      }
    }), _el$109, _co$32);
    return _el$98;
  })();
}
function CatalogDatum(props) {
  return (() => {
    var _el$110 = getNextElement(_tmpl$10), _el$111 = _el$110.firstChild, _el$112 = _el$111.nextSibling;
    insert(_el$111, () => props.label);
    insert(_el$112, () => props.value);
    return _el$110;
  })();
}
function ModelOverview(props) {
  return (() => {
    var _el$113 = getNextElement(_tmpl$11), _el$114 = _el$113.firstChild, [_el$115, _co$33] = getNextMarker(_el$114.nextSibling), _el$116 = _el$115.nextSibling, [_el$117, _co$34] = getNextMarker(_el$116.nextSibling);
    insert(_el$113, createComponent(SectionTitle, {
      title: "Overview",
      description: "Recent tokens, sessions, and market position."
    }), _el$115, _co$33);
    insert(_el$113, createComponent(Show, {
      get when() {
        return props.data;
      },
      get fallback() {
        return createComponent(ModelEmptyState, {
          title: "No usage summary",
          description: "This model has no OpenCode usage rows yet."
        });
      },
      children: (data) => (() => {
        var _el$118 = getNextElement(_tmpl$12), _el$119 = _el$118.firstChild, [_el$120, _co$35] = getNextMarker(_el$119.nextSibling), _el$121 = _el$120.nextSibling, [_el$122, _co$36] = getNextMarker(_el$121.nextSibling), _el$123 = _el$122.nextSibling, [_el$124, _co$37] = getNextMarker(_el$123.nextSibling), _el$125 = _el$124.nextSibling, [_el$126, _co$38] = getNextMarker(_el$125.nextSibling);
        insert(_el$118, createComponent(MetricCard, {
          label: "Tokens",
          get value() {
            return formatTokens(data().totals.tokens);
          },
          detail: "last two months"
        }), _el$120, _co$35);
        insert(_el$118, createComponent(MetricCard, {
          label: "Sessions",
          get value() {
            return formatInteger(data().totals.sessions);
          },
          detail: "completed sessions"
        }), _el$122, _co$36);
        insert(_el$118, createComponent(MetricCard, {
          label: "Token Share",
          get value() {
            return formatPercent(data().tokenShare);
          },
          get detail() {
            return `${data().totalModels} models`;
          }
        }), _el$124, _co$37);
        insert(_el$118, createComponent(MetricCard, {
          label: "Momentum",
          get value() {
            return formatChange(data().tokenChange);
          },
          detail: "vs previous window",
          get state() {
            return data().tokenChange < 0 ? "negative" : "positive";
          }
        }), _el$126, _co$38);
        return _el$118;
      })()
    }), _el$117, _co$34);
    return _el$113;
  })();
}
function ModelUsageSection(props) {
  const [activeIndex, setActiveIndex] = createSignal();
  const max = createMemo(() => Math.max(0, ...props.data.map((item) => item.tokens)) || 1);
  const activePoint = createMemo(() => {
    const index = activeIndex();
    if (index === void 0) return void 0;
    return props.data[index];
  });
  return (() => {
    var _el$127 = getNextElement(_tmpl$14), _el$131 = _el$127.firstChild, [_el$132, _co$39] = getNextMarker(_el$131.nextSibling), _el$133 = _el$132.nextSibling, [_el$134, _co$40] = getNextMarker(_el$133.nextSibling);
    insert(_el$127, createComponent(SectionTitle, {
      title: "Usage",
      description: "Daily token volume over the recent two-month window."
    }), _el$132, _co$39);
    insert(_el$127, createComponent(Show, {
      get when() {
        return props.data.some((item) => item.tokens > 0);
      },
      get fallback() {
        return createComponent(ModelEmptyState, {
          title: "No usage",
          description: "No usage landed in the current window."
        });
      },
      get children() {
        var _el$128 = getNextElement(_tmpl$13), _el$129 = _el$128.firstChild, _el$130 = _el$129.nextSibling;
        _el$128.addEventListener("pointerleave", (event) => {
          if (event.pointerType === "touch") return;
          setActiveIndex(void 0);
        });
        insert(_el$129, createComponent(For, {
          get each() {
            return props.data;
          },
          children: (point, index) => (() => {
            var _el$135 = getNextElement(_tmpl$15), _el$136 = _el$135.firstChild, _el$137 = _el$136.firstChild, _el$138 = _el$137.nextSibling;
            insert(_el$137, () => formatTokens(point.tokens));
            insert(_el$138, () => point.date);
            createRenderEffect((_p$) => {
              var _v$5 = activeIndex() === index() ? "true" : void 0, _v$6 = isModelUsageLabelHidden(index(), props.data.length) ? "true" : void 0;
              _v$5 !== _p$.e && setAttribute(_el$135, "data-active", _p$.e = _v$5);
              _v$6 !== _p$.t && setAttribute(_el$135, "data-label-hidden", _p$.t = _v$6);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            return _el$135;
          })()
        }));
        insert(_el$130, createComponent(For, {
          get each() {
            return props.data;
          },
          children: (point, index) => (() => {
            var _el$139 = getNextElement(_tmpl$16), _el$140 = _el$139.firstChild, _el$141 = _el$140.nextSibling, [_el$142, _co$41] = getNextMarker(_el$141.nextSibling);
            _el$139.$$keydown = (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setActiveIndex(index());
            };
            _el$139.addEventListener("blur", () => setActiveIndex(void 0));
            _el$139.addEventListener("focus", () => setActiveIndex(index()));
            _el$139.$$click = () => setActiveIndex(index());
            _el$139.$$pointermove = (event) => {
              if (event.pointerType === "touch") return;
              setActiveIndex(index());
            };
            _el$139.addEventListener("pointerenter", () => setActiveIndex(index()));
            _el$139.$$pointerdown = (event) => {
              if (event.pointerType !== "touch") return;
              setActiveIndex(index());
            };
            insert(_el$139, createComponent(Show, {
              get when() {
                return memo(() => activeIndex() === index())() && activePoint();
              },
              children: (active) => (() => {
                var _el$143 = getNextElement(_tmpl$17), _el$144 = _el$143.firstChild, _el$145 = _el$144.nextSibling, _el$147 = _el$145.firstChild, [_el$148, _co$42] = getNextMarker(_el$147.nextSibling);
                _el$148.nextSibling;
                var _el$149 = _el$145.nextSibling, _el$150 = _el$149.nextSibling, _el$151 = _el$150.firstChild, _el$152 = _el$151.nextSibling;
                insert(_el$144, () => active().date);
                insert(_el$145, () => formatTokens(active().tokens), _el$148, _co$42);
                insert(_el$152, () => formatTokens(active().tokens));
                createRenderEffect(() => setAttribute(_el$143, "data-placement", index() > props.data.length * 0.62 ? "left" : "right"));
                return _el$143;
              })()
            }), _el$142, _co$41);
            createRenderEffect((_p$) => {
              var _v$7 = `${point.date} ${formatTokens(point.tokens)} tokens`, _v$8 = activeIndex() === index() ? "true" : void 0, _v$9 = activeIndex() !== void 0 && activeIndex() !== index() ? "true" : void 0, _v$0 = {
                "--model-usage-fill": `${modelUsageHeight(point.tokens, max())}%`
              };
              _v$7 !== _p$.e && setAttribute(_el$139, "aria-label", _p$.e = _v$7);
              _v$8 !== _p$.t && setAttribute(_el$139, "data-active", _p$.t = _v$8);
              _v$9 !== _p$.a && setAttribute(_el$139, "data-muted", _p$.a = _v$9);
              _p$.o = style(_el$140, _v$0, _p$.o);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            runHydrationEvents();
            return _el$139;
          })()
        }));
        createRenderEffect((_p$) => {
          var _v$3 = isModelUsageDense(props.data.length) ? "true" : void 0, _v$4 = {
            "--model-usage-count": props.data.length
          };
          _v$3 !== _p$.e && setAttribute(_el$128, "data-dense-labels", _p$.e = _v$3);
          _p$.t = style(_el$128, _v$4, _p$.t);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$128;
      }
    }), _el$134, _co$40);
    return _el$127;
  })();
}
function ModelEfficiencySection(props) {
  return (() => {
    var _el$153 = getNextElement(_tmpl$18), _el$154 = _el$153.firstChild, [_el$155, _co$43] = getNextMarker(_el$154.nextSibling), _el$156 = _el$155.nextSibling, [_el$157, _co$44] = getNextMarker(_el$156.nextSibling);
    insert(_el$153, createComponent(SectionTitle, {
      title: "Efficiency",
      description: "Cost, cache behavior, and average session shape."
    }), _el$155, _co$43);
    insert(_el$153, createComponent(Show, {
      get when() {
        return props.data;
      },
      get fallback() {
        return createComponent(ModelEmptyState, {
          title: "No efficiency data",
          description: "Efficiency data appears after usage lands."
        });
      },
      children: (data) => (() => {
        var _el$158 = getNextElement(_tmpl$19), _el$159 = _el$158.firstChild, [_el$160, _co$45] = getNextMarker(_el$159.nextSibling), _el$161 = _el$160.nextSibling, [_el$162, _co$46] = getNextMarker(_el$161.nextSibling), _el$163 = _el$162.nextSibling, [_el$164, _co$47] = getNextMarker(_el$163.nextSibling), _el$165 = _el$164.nextSibling, [_el$166, _co$48] = getNextMarker(_el$165.nextSibling), _el$167 = _el$166.nextSibling, [_el$168, _co$49] = getNextMarker(_el$167.nextSibling);
        insert(_el$158, createComponent(MetricCard, {
          label: "Cost",
          get value() {
            return formatMoney(data().totals.cost);
          },
          detail: "total spend"
        }), _el$160, _co$45);
        insert(_el$158, createComponent(MetricCard, {
          label: "Cost / 1M",
          get value() {
            return memo(() => !!props.catalog?.cost)() ? formatCatalogPrice(props.catalog.cost) : formatMoney(data().totals.costPerMillion);
          },
          get detail() {
            return props.catalog?.cost ? "input / output" : "observed all tokens";
          }
        }), _el$162, _co$46);
        insert(_el$158, createComponent(MetricCard, {
          label: "Cost / Session",
          get value() {
            return formatSessionCost(data().totals.costPerSession);
          },
          detail: "average"
        }), _el$164, _co$47);
        insert(_el$158, createComponent(MetricCard, {
          label: "Tokens / Session",
          get value() {
            return formatTokens(data().totals.tokensPerSession);
          },
          detail: "average"
        }), _el$166, _co$48);
        insert(_el$158, createComponent(MetricCard, {
          label: "Cache Ratio",
          get value() {
            return formatPercent(data().totals.cacheRatio);
          },
          detail: "input tokens"
        }), _el$168, _co$49);
        return _el$158;
      })()
    }), _el$157, _co$44);
    return _el$153;
  })();
}
function ModelGeoBreakdownSection(props) {
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
    var _el$169 = getNextElement(_tmpl$21), _el$178 = _el$169.firstChild, [_el$179, _co$53] = getNextMarker(_el$178.nextSibling), _el$180 = _el$179.nextSibling, [_el$181, _co$54] = getNextMarker(_el$180.nextSibling);
    _el$169.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      setActiveCountry(void 0);
    });
    insert(_el$169, createComponent(SectionTitle, {
      title: "Geo Breakdown",
      description: "Model tokens used by country."
    }), _el$179, _co$53);
    insert(_el$169, createComponent(Show, {
      get when() {
        return data().length > 0;
      },
      get fallback() {
        return createComponent(ModelEmptyState, {
          title: "No geo data",
          description: "No geo_stat rows matched this model."
        });
      },
      get children() {
        var _el$170 = getNextElement(_tmpl$20), _el$171 = _el$170.firstChild, _el$172 = _el$171.firstChild, [_el$173, _co$50] = getNextMarker(_el$172.nextSibling), _el$174 = _el$173.nextSibling, [_el$175, _co$51] = getNextMarker(_el$174.nextSibling), _el$176 = _el$171.nextSibling, [_el$177, _co$52] = getNextMarker(_el$176.nextSibling);
        insert(_el$171, createComponent(GeoWorldMap, {
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
        }), _el$173, _co$50);
        insert(_el$171, createComponent(Show, {
          get when() {
            return active();
          },
          children: (country) => (() => {
            var _el$182 = getNextElement(_tmpl$22), _el$183 = _el$182.firstChild, _el$184 = _el$183.firstChild, _el$185 = _el$184.nextSibling, [_el$186, _co$55] = getNextMarker(_el$185.nextSibling), _el$187 = _el$183.nextSibling, _el$188 = _el$187.nextSibling, _el$189 = _el$188.firstChild, _el$190 = _el$189.nextSibling;
            insert(_el$183, () => String(country().rank).padStart(2, "0"), _el$186, _co$55);
            insert(_el$187, () => formatCountryName(country().country));
            insert(_el$189, () => formatGeoTokens(country().tokens));
            insert(_el$190, () => formatGeoShare(country().share));
            return _el$182;
          })()
        }), _el$175, _co$51);
        insert(_el$170, createComponent(GeoCountryList, {
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
        }), _el$177, _co$52);
        return _el$170;
      }
    }), _el$181, _co$54);
    return _el$169;
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
    var _el$191 = getNextElement(_tmpl$23), _el$192 = _el$191.firstChild, _el$193 = _el$192.nextSibling, _el$194 = _el$193.nextSibling, _el$195 = _el$194.nextSibling;
    insert(_el$193, createComponent(For, {
      each: worldCountryPaths,
      children: (country) => {
        const entry = () => props.countryById.get(country.id);
        return (() => {
          var _el$196 = getNextElement(_tmpl$24);
          _el$196.$$click = () => {
            const item = entry();
            if (!item) return;
            props.onActiveCountryChange(item.country);
          };
          _el$196.addEventListener("pointerenter", () => {
            const item = entry();
            if (!item) return;
            props.onActiveCountryChange(item.country);
          });
          createRenderEffect((_p$) => {
            var _v$1 = country.path, _v$10 = country.id, _v$11 = entry() ? "true" : void 0, _v$12 = entry()?.country === props.activeCountry ? "true" : void 0, _v$13 = {
              "--geo-country-opacity": String(countryOpacity(entry()))
            };
            _v$1 !== _p$.e && setAttribute(_el$196, "d", _p$.e = _v$1);
            _v$10 !== _p$.t && setAttribute(_el$196, "data-country-id", _p$.t = _v$10);
            _v$11 !== _p$.a && setAttribute(_el$196, "data-has-data", _p$.a = _v$11);
            _v$12 !== _p$.o && setAttribute(_el$196, "data-active", _p$.o = _v$12);
            _p$.i = style(_el$196, _v$13, _p$.i);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0,
            i: void 0
          });
          runHydrationEvents();
          return _el$196;
        })();
      }
    }));
    insert(_el$194, createComponent(For, {
      each: worldCountryPaths,
      children: (country) => {
        const entry = () => props.countryById.get(country.id);
        return createComponent(Show, {
          get when() {
            return memo(() => !!(country.marker && entry()))() ? country.marker : void 0;
          },
          children: (marker) => (() => {
            var _el$197 = getNextElement(_tmpl$25);
            _el$197.$$click = () => {
              const item = entry();
              if (!item) return;
              props.onActiveCountryChange(item.country);
            };
            _el$197.addEventListener("pointerenter", () => {
              const item = entry();
              if (!item) return;
              props.onActiveCountryChange(item.country);
            });
            createRenderEffect((_p$) => {
              var _v$14 = marker().x, _v$15 = marker().y, _v$16 = entry()?.country === props.activeCountry ? 3.4 : 2.4, _v$17 = entry()?.country === props.activeCountry ? "true" : void 0, _v$18 = {
                "--geo-country-opacity": String(countryOpacity(entry()))
              };
              _v$14 !== _p$.e && setAttribute(_el$197, "cx", _p$.e = _v$14);
              _v$15 !== _p$.t && setAttribute(_el$197, "cy", _p$.t = _v$15);
              _v$16 !== _p$.a && setAttribute(_el$197, "r", _p$.a = _v$16);
              _v$17 !== _p$.o && setAttribute(_el$197, "data-active", _p$.o = _v$17);
              _p$.i = style(_el$197, _v$18, _p$.i);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0
            });
            runHydrationEvents();
            return _el$197;
          })()
        });
      }
    }));
    setAttribute(_el$195, "d", worldBorderPath);
    return _el$191;
  })();
}
function GeoCountryList(props) {
  const opacityScale = createMemo(() => sqrt().domain([0, props.maxTokens]).range([0.26, 0.96]).clamp(true));
  return (() => {
    var _el$198 = getNextElement(_tmpl$26);
    insert(_el$198, createComponent(For, {
      get each() {
        return props.data;
      },
      children: (country) => (() => {
        var _el$199 = getNextElement(_tmpl$27), _el$200 = _el$199.firstChild, _el$201 = _el$200.firstChild, _el$202 = _el$201.nextSibling, _el$203 = _el$202.nextSibling, _el$204 = _el$203.nextSibling, _el$205 = _el$204.nextSibling;
        _el$200.addEventListener("focus", () => props.onActiveCountryChange(country.country));
        _el$200.addEventListener("pointerenter", () => props.onActiveCountryChange(country.country));
        _el$200.$$click = () => props.onActiveCountryChange(country.country);
        insert(_el$201, () => String(country.rank).padStart(2, "0"));
        insert(_el$203, () => formatCountryName(country.country));
        insert(_el$204, () => formatGeoTokens(country.tokens));
        insert(_el$205, () => formatGeoShare(country.share));
        createRenderEffect((_p$) => {
          var _v$19 = props.activeCountry === country.country ? "true" : void 0, _v$20 = {
            "--geo-row-opacity": String(opacityScale()(country.tokens))
          }, _v$21 = `${formatCountryName(country.country)} ${formatGeoTokens(country.tokens)} ${formatGeoShare(country.share)}`;
          _v$19 !== _p$.e && setAttribute(_el$200, "data-active", _p$.e = _v$19);
          _p$.t = style(_el$200, _v$20, _p$.t);
          _v$21 !== _p$.a && setAttribute(_el$200, "aria-label", _p$.a = _v$21);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        runHydrationEvents();
        return _el$199;
      })()
    }));
    return _el$198;
  })();
}
function ModelPeersSection(props) {
  return (() => {
    var _el$206 = getNextElement(_tmpl$29), _el$208 = _el$206.firstChild, [_el$209, _co$56] = getNextMarker(_el$208.nextSibling), _el$210 = _el$209.nextSibling, [_el$211, _co$57] = getNextMarker(_el$210.nextSibling);
    insert(_el$206, createComponent(SectionTitle, {
      title: "Peers",
      description: "Nearby models by recent token volume."
    }), _el$209, _co$56);
    insert(_el$206, createComponent(Show, {
      get when() {
        return props.data?.peers.length;
      },
      get fallback() {
        return createComponent(ModelEmptyState, {
          title: "No peers",
          description: "Peer rankings appear after usage lands."
        });
      },
      get children() {
        var _el$207 = getNextElement(_tmpl$28);
        insert(_el$207, createComponent(For, {
          get each() {
            return props.data?.peers ?? [];
          },
          children: (peer) => createComponent(PeerRow, {
            peer,
            get active() {
              return peer.model === props.data?.model;
            }
          })
        }));
        return _el$207;
      }
    }), _el$211, _co$57);
    return _el$206;
  })();
}
function MetricCard(props) {
  return (() => {
    var _el$212 = getNextElement(_tmpl$30), _el$213 = _el$212.firstChild, _el$214 = _el$213.nextSibling, _el$215 = _el$214.nextSibling;
    insert(_el$213, () => props.label);
    insert(_el$214, () => props.value);
    insert(_el$215, () => props.detail);
    createRenderEffect(() => setAttribute(_el$212, "data-state", props.state));
    return _el$212;
  })();
}
function PeerRow(props) {
  return (() => {
    var _el$216 = getNextElement(_tmpl$31), _el$217 = _el$216.firstChild, _el$218 = _el$217.firstChild, _el$222 = _el$218.nextSibling, [_el$223, _co$58] = getNextMarker(_el$222.nextSibling), _el$219 = _el$223.nextSibling, _el$220 = _el$219.nextSibling, _el$221 = _el$220.nextSibling;
    insert(_el$218, () => String(props.peer.rank).padStart(2, "0"));
    insert(_el$217, createComponent(ProviderIcon, {
      "aria-hidden": "true",
      get id() {
        return getProviderIconId(props.peer.author);
      }
    }), _el$223, _co$58);
    insert(_el$219, () => props.peer.model);
    insert(_el$220, () => props.peer.author);
    insert(_el$221, () => formatTokens(props.peer.tokens));
    createRenderEffect((_p$) => {
      var _v$22 = `${"/data/"}${providerSlug(props.peer.provider)}/${props.peer.slug}`, _v$23 = props.active ? "true" : void 0;
      _v$22 !== _p$.e && setAttribute(_el$217, "href", _p$.e = _v$22);
      _v$23 !== _p$.t && setAttribute(_el$217, "data-active", _p$.t = _v$23);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$216;
  })();
}
function SectionTitle(props) {
  return (() => {
    var _el$224 = getNextElement(_tmpl$32), _el$225 = _el$224.firstChild, _el$227 = _el$225.firstChild, [_el$228, _co$59] = getNextMarker(_el$227.nextSibling);
    _el$228.nextSibling;
    var _el$229 = _el$225.nextSibling, _el$230 = _el$229.nextSibling;
    insert(_el$225, () => props.title, _el$228, _co$59);
    insert(_el$230, () => props.description);
    return _el$224;
  })();
}
function ModelEmptyState(props) {
  return (() => {
    var _el$231 = getNextElement(_tmpl$33), _el$232 = _el$231.firstChild, _el$233 = _el$232.nextSibling;
    insert(_el$232, () => props.title);
    insert(_el$233, () => props.description);
    createRenderEffect(() => setAttribute(_el$231, "data-compact", props.compact ? "true" : void 0));
    return _el$231;
  })();
}
function getProviderIconId(author) {
  if (author === "MiniMax") return "minimax";
  if (author === "Moonshot") return "moonshotai";
  if (author === "Zhipu") return "zhipuai";
  return author.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function emptyCountryRecord() {
  return {
    "1D": [],
    "1W": [],
    "2W": [],
    "1M": [],
    "2M": [],
    "3M": [],
    YTD: [],
    ALL: []
  };
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
  return formatTokens(value * 1e12);
}
function formatGeoShare(value) {
  return `${value.toFixed(value > 0 && value < 1 ? 1 : 0)}%`;
}
function modelUsageHeight(tokens, max) {
  if (tokens <= 0) return 0;
  return Math.max(2, Math.min(100, tokens / max * 100));
}
function isModelUsageDense(count) {
  return count > 20;
}
function isModelUsageLabelHidden(index, count) {
  if (count <= 16) return false;
  const interval = Math.ceil(count / 8);
  return index !== count - 1 && index % interval !== 0;
}
function formatRankMove(previousRank, rank) {
  const change = previousRank - rank;
  if (change > 0) return `+${change}`;
  if (change < 0) return `${change}`;
  return "Even";
}
function formatModelRankMoveLabel(data) {
  if (data.rank === null) return "No usage last week";
  if (data.previousRank === null) return "New this week";
  return `${formatRankMove(data.previousRank, data.rank)} vs previous week`;
}
function formatTokens(value) {
  if (value >= 1e12) return `${trimNumber(value / 1e12, value >= 1e13 ? 0 : 1)}T`;
  if (value >= 1e9) return `${trimNumber(value / 1e9, value >= 1e10 ? 0 : 1)}B`;
  if (value >= 1e6) return `${trimNumber(value / 1e6, value >= 1e7 ? 0 : 1)}M`;
  if (value >= 1e3) return `${trimNumber(value / 1e3, value >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(value));
}
function formatInteger(value) {
  return new Intl.NumberFormat("en").format(value);
}
function formatPercent(value) {
  return `${value.toFixed(value > 0 && value < 10 ? 1 : 0)}%`;
}
function formatMoney(value) {
  if (value >= 1e6) return `$${trimNumber(value / 1e6, value >= 1e7 ? 0 : 1)}M`;
  if (value >= 1e3) return `$${trimNumber(value / 1e3, value >= 1e4 ? 0 : 1)}K`;
  return `$${value.toFixed(value >= 10 ? 0 : 2)}`;
}
function formatCatalogPrice(value) {
  return `${formatModelPrice(value.input)} / ${formatModelPrice(value.output)}`;
}
function formatModelPrice(value) {
  if (value > 0 && value < 0.01) return `$${value.toFixed(4)}`;
  return formatMoney(value);
}
function formatSessionCost(value) {
  return `$${value.toFixed(value > 0 && value < 0.01 ? 4 : 2)}`;
}
function formatChange(value) {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}
function formatCatalogLimit(value) {
  return value === void 0 ? "Unknown" : formatTokens(value);
}
function formatCatalogModalities(value) {
  if (value.length === 0) return "Unknown";
  return value.map(formatCatalogModality).join(", ");
}
function formatCatalogModality(value) {
  if (value === "pdf") return "PDF";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function formatCatalogDate(value) {
  if (!value) return "Unknown";
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) - 1 : 0;
  const day = match[3] ? Number(match[3]) : 1;
  return new Intl.DateTimeFormat("en", {
    month: match[2] ? "short" : void 0,
    day: match[3] ? "numeric" : void 0,
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month, day)));
}
function trimNumber(value, digits) {
  return Number(value.toFixed(digits)).toLocaleString("en");
}
function providerSlug(provider) {
  return provider.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}
delegateEvents(["pointerdown", "pointermove", "click", "keydown"]);
export {
  StatsModel as default
};
