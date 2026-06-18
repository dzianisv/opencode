import { a4 as useParams, k as createMemo, q as createSignal, N as onMount, v as getNextElement, w as getNextMarker, z as insert, i as createComponent, l as createRenderEffect, a0 as template, r as delegateEvents, T as Title, M as Meta, L as Link, S as Show, Q as setAttribute, D as memo, F as For, $ as style, O as runHydrationEvents } from "./routing--lmSOy1r.js";
import { c as createAsync, b as createServerReference, q as query, h as getModelCatalog, d as findModelCatalogLab, g as getGitHubStars, e as formatCatalogLabName, t as themeStorageKey, a as applyThemePreference, j as isThemePreference, H as Header, F as Footer } from "./stats-shell-CsMXs3yn.js";
var _tmpl$ = /* @__PURE__ */ template(`<main data-page=stats><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><!$><!/><div data-component=container><div data-component=content></div><!$><!/>`), _tmpl$2 = /* @__PURE__ */ template(`<section id=overview data-section=lab-hero><div data-slot=model-hero-grid><div data-slot=model-hero-copy><a data-slot=model-back-link>Data</a><h1>Model Lab</h1><p>Reading model availability and recent OpenCode usage.`), _tmpl$3 = /* @__PURE__ */ template(`<section id=overview data-section=lab-hero><div data-slot=model-hero-grid><div data-slot=model-hero-copy><a data-slot=model-back-link>Data</a><h1></h1><p>No models matched this lab.`), _tmpl$4 = /* @__PURE__ */ template(`<section id=overview data-section=lab-hero><a data-slot=model-back-link>Data</a><div data-slot=model-hero-grid><div data-slot=model-hero-copy><h1></h1><div data-slot=model-hero-pattern aria-hidden=true></div><p>Explore <!$><!/> <!$><!/> models used in OpenCode<!$><!/>. Compare recent token usage, context windows, release dates, and model-specific data.</p></div><div data-component=model-rank-panel><span>Tokens Processed</span><strong></strong><p>`), _tmpl$5 = /* @__PURE__ */ template(`<div data-component=model-usage-chart role=img><div data-slot=model-usage-axis aria-hidden=true></div><div data-slot=model-usage-bars>`), _tmpl$6 = /* @__PURE__ */ template(`<section id=usage data-section=model-panel><p data-slot=section-title><strong><!$><!/> token usage.</strong> <span>Daily OpenCode token volume over the last two months.</span></p><!$><!/>`), _tmpl$7 = /* @__PURE__ */ template(`<div><span data-slot=model-usage-label><span data-slot=model-usage-total></span><span data-slot=model-usage-date>`), _tmpl$8 = /* @__PURE__ */ template(`<div data-slot=model-usage-column role=button tabindex=0><div data-slot=model-usage-bar></div><!$><!/>`), _tmpl$9 = /* @__PURE__ */ template(`<div data-component=chart-tooltip><strong></strong><span><!$><!/> tokens</span><div data-slot=tooltip-divider></div><p><span data-slot=tooltip-label><i></i> Daily tokens</span><b>`), _tmpl$0 = /* @__PURE__ */ template(`<section id=models data-section=model-panel><p data-slot=section-title><strong><!$><!/> models.</strong> <span>Recent usage and limits.</span></p><div data-component=lab-model-grid>`), _tmpl$1 = /* @__PURE__ */ template(`<a data-component=lab-model-card><strong></strong><div data-slot=lab-model-card-meta><p><b>Usage</b><em></em></p><p><b>Share</b><em></em></p><p><b>Context</b><em></em></p><p><b>Output</b><em></em></p><p><b>Release</b><em>`), _tmpl$10 = /* @__PURE__ */ template(`<div data-component=empty-state data-compact=true><strong></strong><p>`);
const statsCanonicalBaseUrl = "https://opencode.ai/data/";
const statsUnfurlPath = "banner.png";
const statsUnfurlAlt = "OpenCode Data wordmark on a dark patterned background";
const statsUnfurlUrl = new URL(statsUnfurlPath, statsCanonicalBaseUrl).toString();
const labHeaderLinks = [{
  href: "#overview",
  label: "Overview"
}, {
  href: "#usage",
  label: "Usage"
}, {
  href: "#models",
  label: "Models"
}];
const labFooterLinks = [{
  href: "/data/",
  label: "Data Home"
}, {
  href: `${"/data/"}#top-models`,
  label: "Top Models"
}, {
  href: `${"/data/"}#market-share`,
  label: "Market Share"
}, {
  href: `${"/data/"}#geo-breakdown`,
  label: "Geo Breakdown"
}];
const getLabData_query = createServerReference("31b993f55cb3d1f4539ab6efe4d32d6b67b069e91c483fe9b4c58a7d472e3c7e");
const getLabData = query(getLabData_query, "getStatsLabData");
function StatsLab() {
  const params = useParams();
  const labParam = createMemo(() => params.lab ?? "");
  const catalog = createAsync(() => getModelCatalog());
  const lab = createMemo(() => {
    const data = catalog();
    if (!data) return void 0;
    return findModelCatalogLab(data, labParam()) ?? null;
  });
  const stats = createAsync(() => {
    const entry = lab();
    if (catalog() === void 0 || entry === void 0) return Promise.resolve(void 0);
    if (!entry) return Promise.resolve(null);
    return getLabData(entry.id);
  });
  const githubStars = createAsync(() => getGitHubStars());
  const [themePreference, setThemePreference] = createSignal("system");
  const labName = createMemo(() => lab()?.name ?? formatCatalogLabName(labParam()));
  const labTitle = createMemo(() => `${labName()} Models`);
  const labDescription = createMemo(() => `Explore ${labName()} models used in OpenCode, with recent token usage, context windows, release dates, and model-specific data.`);
  const labUrl = createMemo(() => new URL(lab()?.id ?? labParam(), statsCanonicalBaseUrl).toString());
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
        return labTitle();
      }
    }), _el$7, _co$2);
    insert(_el$, createComponent(Meta, {
      name: "description",
      get content() {
        return labDescription();
      }
    }), _el$9, _co$3);
    insert(_el$, createComponent(Link, {
      rel: "canonical",
      get href() {
        return labUrl();
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
        return labTitle();
      }
    }), _el$15, _co$7);
    insert(_el$, createComponent(Meta, {
      property: "og:description",
      get content() {
        return labDescription();
      }
    }), _el$17, _co$8);
    insert(_el$, createComponent(Meta, {
      property: "og:url",
      get content() {
        return labUrl();
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
        return labTitle();
      }
    }), _el$33, _co$14);
    insert(_el$, createComponent(Meta, {
      name: "twitter:description",
      get content() {
        return labDescription();
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
      links: labHeaderLinks,
      get brandHref() {
        return "/data/";
      }
    }), _el$41, _co$18);
    insert(_el$3, createComponent(Show, {
      get when() {
        return catalog() !== void 0;
      },
      get fallback() {
        return createComponent(LabLoading, {});
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return lab();
          },
          get fallback() {
            return createComponent(LabNotFound, {
              get lab() {
                return labParam();
              }
            });
          },
          children: (data) => [createComponent(LabHero, {
            get lab() {
              return data();
            },
            get stats() {
              return stats() ?? null;
            }
          }), createComponent(LabUsageSection, {
            get lab() {
              return data();
            },
            get data() {
              return stats() ?? null;
            }
          }), createComponent(LabModelsSection, {
            get lab() {
              return data();
            },
            get usage() {
              return stats()?.models ?? [];
            }
          })]
        });
      }
    }));
    insert(_el$2, createComponent(Footer, {
      get themePreference() {
        return themePreference();
      },
      onThemePreferenceChange: updateThemePreference,
      links: labFooterLinks
    }), _el$5, _co$);
    createRenderEffect(() => setAttribute(_el$, "data-theme", themePreference()));
    return _el$;
  })();
}
function LabLoading() {
  return (() => {
    var _el$42 = getNextElement(_tmpl$2), _el$43 = _el$42.firstChild, _el$44 = _el$43.firstChild, _el$45 = _el$44.firstChild;
    createRenderEffect(() => setAttribute(_el$45, "href", "/data/"));
    return _el$42;
  })();
}
function LabNotFound(props) {
  return (() => {
    var _el$46 = getNextElement(_tmpl$3), _el$47 = _el$46.firstChild, _el$48 = _el$47.firstChild, _el$49 = _el$48.firstChild, _el$50 = _el$49.nextSibling;
    insert(_el$50, () => formatCatalogLabName(props.lab));
    createRenderEffect(() => setAttribute(_el$49, "href", "/data/"));
    return _el$46;
  })();
}
function LabHero(props) {
  const latest = createMemo(() => props.lab.models.map((model) => model.releaseDate).filter((value) => value !== void 0).toSorted((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]);
  const featuredModels = createMemo(() => props.lab.models.slice(0, 3).map((model) => model.name));
  return (() => {
    var _el$51 = getNextElement(_tmpl$4), _el$52 = _el$51.firstChild, _el$53 = _el$52.nextSibling, _el$54 = _el$53.firstChild, _el$55 = _el$54.firstChild, _el$56 = _el$55.nextSibling, _el$57 = _el$56.nextSibling, _el$58 = _el$57.firstChild, _el$62 = _el$58.nextSibling, [_el$63, _co$19] = getNextMarker(_el$62.nextSibling), _el$59 = _el$63.nextSibling, _el$64 = _el$59.nextSibling, [_el$65, _co$20] = getNextMarker(_el$64.nextSibling), _el$60 = _el$65.nextSibling, _el$66 = _el$60.nextSibling, [_el$67, _co$21] = getNextMarker(_el$66.nextSibling);
    _el$67.nextSibling;
    var _el$68 = _el$54.nextSibling, _el$69 = _el$68.firstChild, _el$70 = _el$69.nextSibling, _el$71 = _el$70.nextSibling;
    insert(_el$55, () => props.lab.name);
    insert(_el$57, () => props.lab.models.length, _el$63, _co$19);
    insert(_el$57, () => props.lab.name, _el$65, _co$20);
    insert(_el$57, createComponent(Show, {
      get when() {
        return featuredModels().length > 0;
      },
      get children() {
        return [" including ", memo(() => formatList(featuredModels()))];
      }
    }), _el$67, _co$21);
    insert(_el$70, (() => {
      var _c$ = memo(() => !!props.stats);
      return () => _c$() ? formatTokens(props.stats.totals.tokens) : "Pending";
    })());
    insert(_el$71, (() => {
      var _c$2 = memo(() => !!props.stats);
      return () => _c$2() ? `${formatPercent(props.stats.tokenShare)} of recent OpenCode usage` : memo(() => !!latest())() ? `Latest release ${formatCatalogDate(latest())}` : "Usage appears after model activity lands";
    })());
    createRenderEffect(() => setAttribute(_el$52, "href", "/data/"));
    return _el$51;
  })();
}
function LabUsageSection(props) {
  const [activeIndex, setActiveIndex] = createSignal();
  const usage = createMemo(() => props.data?.usage ?? []);
  const max = createMemo(() => Math.max(0, ...usage().map((item) => item.tokens)) || 1);
  const activePoint = createMemo(() => {
    const index = activeIndex();
    if (index === void 0) return void 0;
    return usage()[index];
  });
  return (() => {
    var _el$72 = getNextElement(_tmpl$6), _el$73 = _el$72.firstChild, _el$74 = _el$73.firstChild, _el$76 = _el$74.firstChild, [_el$77, _co$22] = getNextMarker(_el$76.nextSibling);
    _el$77.nextSibling;
    var _el$81 = _el$73.nextSibling, [_el$82, _co$23] = getNextMarker(_el$81.nextSibling);
    insert(_el$74, () => props.lab.name, _el$77, _co$22);
    insert(_el$72, createComponent(Show, {
      get when() {
        return usage().some((item) => item.tokens > 0);
      },
      get fallback() {
        return createComponent(LabEmptyState, {
          title: "No usage yet",
          description: "Recent token usage appears here once this lab has activity."
        });
      },
      get children() {
        var _el$78 = getNextElement(_tmpl$5), _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling;
        _el$78.addEventListener("pointerleave", (event) => {
          if (event.pointerType === "touch") return;
          setActiveIndex(void 0);
        });
        insert(_el$79, createComponent(For, {
          get each() {
            return usage();
          },
          children: (point, index) => (() => {
            var _el$83 = getNextElement(_tmpl$7), _el$84 = _el$83.firstChild, _el$85 = _el$84.firstChild, _el$86 = _el$85.nextSibling;
            insert(_el$85, () => formatTokens(point.tokens));
            insert(_el$86, () => point.date);
            createRenderEffect((_p$) => {
              var _v$4 = activeIndex() === index() ? "true" : void 0, _v$5 = isLabUsageLabelHidden(index(), usage().length) ? "true" : void 0;
              _v$4 !== _p$.e && setAttribute(_el$83, "data-active", _p$.e = _v$4);
              _v$5 !== _p$.t && setAttribute(_el$83, "data-label-hidden", _p$.t = _v$5);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            return _el$83;
          })()
        }));
        insert(_el$80, createComponent(For, {
          get each() {
            return usage();
          },
          children: (point, index) => (() => {
            var _el$87 = getNextElement(_tmpl$8), _el$88 = _el$87.firstChild, _el$89 = _el$88.nextSibling, [_el$90, _co$24] = getNextMarker(_el$89.nextSibling);
            _el$87.$$keydown = (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setActiveIndex(index());
            };
            _el$87.addEventListener("blur", () => setActiveIndex(void 0));
            _el$87.addEventListener("focus", () => setActiveIndex(index()));
            _el$87.$$click = () => setActiveIndex(index());
            _el$87.$$pointermove = (event) => {
              if (event.pointerType === "touch") return;
              setActiveIndex(index());
            };
            _el$87.addEventListener("pointerenter", () => setActiveIndex(index()));
            _el$87.$$pointerdown = (event) => {
              if (event.pointerType !== "touch") return;
              setActiveIndex(index());
            };
            insert(_el$87, createComponent(Show, {
              get when() {
                return memo(() => activeIndex() === index())() && activePoint();
              },
              children: (active) => (() => {
                var _el$91 = getNextElement(_tmpl$9), _el$92 = _el$91.firstChild, _el$93 = _el$92.nextSibling, _el$95 = _el$93.firstChild, [_el$96, _co$25] = getNextMarker(_el$95.nextSibling);
                _el$96.nextSibling;
                var _el$97 = _el$93.nextSibling, _el$98 = _el$97.nextSibling, _el$99 = _el$98.firstChild, _el$100 = _el$99.nextSibling;
                insert(_el$92, () => active().date);
                insert(_el$93, () => formatTokens(active().tokens), _el$96, _co$25);
                insert(_el$100, () => formatTokens(active().tokens));
                createRenderEffect(() => setAttribute(_el$91, "data-placement", index() > usage().length * 0.62 ? "left" : "right"));
                return _el$91;
              })()
            }), _el$90, _co$24);
            createRenderEffect((_p$) => {
              var _v$6 = `${point.date} ${formatTokens(point.tokens)} tokens`, _v$7 = activeIndex() === index() ? "true" : void 0, _v$8 = activeIndex() !== void 0 && activeIndex() !== index() ? "true" : void 0, _v$9 = {
                "--model-usage-fill": `${usageHeight(point.tokens, max())}%`
              };
              _v$6 !== _p$.e && setAttribute(_el$87, "aria-label", _p$.e = _v$6);
              _v$7 !== _p$.t && setAttribute(_el$87, "data-active", _p$.t = _v$7);
              _v$8 !== _p$.a && setAttribute(_el$87, "data-muted", _p$.a = _v$8);
              _p$.o = style(_el$88, _v$9, _p$.o);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            runHydrationEvents();
            return _el$87;
          })()
        }));
        createRenderEffect((_p$) => {
          var _v$ = isLabUsageDense(usage().length) ? "true" : void 0, _v$2 = `${props.lab.name} daily token usage chart`, _v$3 = {
            "--model-usage-count": usage().length
          };
          _v$ !== _p$.e && setAttribute(_el$78, "data-dense-labels", _p$.e = _v$);
          _v$2 !== _p$.t && setAttribute(_el$78, "aria-label", _p$.t = _v$2);
          _p$.a = style(_el$78, _v$3, _p$.a);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$78;
      }
    }), _el$82, _co$23);
    return _el$72;
  })();
}
function LabModelsSection(props) {
  const usageBySlug = createMemo(() => new Map(props.usage.map((item) => [item.slug, item])));
  return (() => {
    var _el$101 = getNextElement(_tmpl$0), _el$102 = _el$101.firstChild, _el$103 = _el$102.firstChild, _el$105 = _el$103.firstChild, [_el$106, _co$26] = getNextMarker(_el$105.nextSibling);
    _el$106.nextSibling;
    var _el$107 = _el$102.nextSibling;
    insert(_el$103, () => props.lab.name, _el$106, _co$26);
    insert(_el$107, createComponent(For, {
      get each() {
        return props.lab.models;
      },
      children: (model) => createComponent(LabModelCard, {
        model,
        get usage() {
          return usageBySlug().get(model.slug);
        }
      })
    }));
    return _el$101;
  })();
}
function LabModelCard(props) {
  return (() => {
    var _el$108 = getNextElement(_tmpl$1), _el$109 = _el$108.firstChild, _el$110 = _el$109.nextSibling, _el$111 = _el$110.firstChild, _el$112 = _el$111.firstChild, _el$113 = _el$112.nextSibling, _el$114 = _el$111.nextSibling, _el$115 = _el$114.firstChild, _el$116 = _el$115.nextSibling, _el$117 = _el$114.nextSibling, _el$118 = _el$117.firstChild, _el$119 = _el$118.nextSibling, _el$120 = _el$117.nextSibling, _el$121 = _el$120.firstChild, _el$122 = _el$121.nextSibling, _el$123 = _el$120.nextSibling, _el$124 = _el$123.firstChild, _el$125 = _el$124.nextSibling;
    insert(_el$109, () => props.model.name);
    insert(_el$113, (() => {
      var _c$3 = memo(() => !!props.usage);
      return () => _c$3() ? formatTokens(props.usage.tokens) : "—";
    })());
    insert(_el$116, (() => {
      var _c$4 = memo(() => !!props.usage);
      return () => _c$4() ? formatPercent(props.usage.share) : "—";
    })());
    insert(_el$119, () => formatCatalogLimit(props.model.limit?.context));
    insert(_el$122, () => formatCatalogLimit(props.model.limit?.output));
    insert(_el$125, () => formatCatalogDate(props.model.releaseDate));
    createRenderEffect(() => setAttribute(_el$108, "href", `${"/data/"}${props.model.id}`));
    return _el$108;
  })();
}
function LabEmptyState(props) {
  return (() => {
    var _el$126 = getNextElement(_tmpl$10), _el$127 = _el$126.firstChild, _el$128 = _el$127.nextSibling;
    insert(_el$127, () => props.title);
    insert(_el$128, () => props.description);
    return _el$126;
  })();
}
function formatCatalogLimit(value) {
  return value === void 0 ? "Unknown" : formatTokens(value);
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
function formatList(values) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}
function formatPercent(value) {
  return `${trimNumber(value, value >= 10 ? 1 : 2)}%`;
}
function formatTokens(value) {
  if (value >= 1e12) return `${trimNumber(value / 1e12, value >= 1e13 ? 0 : 1)}T`;
  if (value >= 1e9) return `${trimNumber(value / 1e9, value >= 1e10 ? 0 : 1)}B`;
  if (value >= 1e6) return `${trimNumber(value / 1e6, value >= 1e7 ? 0 : 1)}M`;
  if (value >= 1e3) return `${trimNumber(value / 1e3, value >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(value));
}
function trimNumber(value, digits) {
  return Number(value.toFixed(digits)).toLocaleString("en");
}
function usageHeight(value, max) {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(4, value / max * 100);
}
function isLabUsageDense(count) {
  return count > 20;
}
function isLabUsageLabelHidden(index, count) {
  if (count <= 14) return false;
  const cadence = count > 45 ? 7 : count > 28 ? 4 : 2;
  return index % cadence !== 0 && index !== count - 1;
}
delegateEvents(["pointerdown", "pointermove", "click", "keydown"]);
export {
  StatsLab as default
};
