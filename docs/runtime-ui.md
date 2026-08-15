# Runtime-driven web configuration

T014 makes the PWA consume the web projection returned by `/runtime-manifest`:
`manifest_version`, enabled API routes, catalog entries, design tokens, navigation items, and `feature_flags`.

The bootstrap lifecycle is `loading -> validate -> registries -> ready`. Invalid payloads stay in an error state and do not render product navigation. The `FeatureFlagRegistry` returns `false` for unknown flags. `NavigationRegistry` filters disabled routes, disabled flags, unsupported capabilities, and items whose route is not enabled.

`RouteRegistry` is a compiled allow-list. The backend can select a `screen_key`, but it cannot inject React code. Unknown screens resolve to a not-available state and are omitted from active navigation. Screen paths are currently technical PWA paths because the existing backend `api_routes.path_template` describes API operations, not browser screens; T015/convergence should decide whether the manifest gains an explicit UI path or a separate screen-route projection.

Design tokens are accepted only for known CSS custom properties and expected token types. Values containing CSS execution primitives such as `url(...)`, `expression(...)`, braces, or semicolons are ignored. The frontend never treats arbitrary token keys as CSS property names.

The current manifest contains `label_key` rather than localized label text. T014 renders that runtime key without inventing business labels; a future manifest/localization contract can replace it without changing navigation ownership. Capability checks remain deny-by-default until an authenticated frontend subject adapter exists.
