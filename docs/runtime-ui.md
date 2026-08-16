# Runtime-driven web configuration

T014 makes the PWA consume the canonical projection returned by `/runtime-manifest`:
`version`, `contentHash`, `apiRoutes`, `ui.routes`, `ui.navigation`, catalog entries,
design tokens, and `featureFlags`.

The bootstrap lifecycle is `loading -> validate -> registries -> ready`. Invalid payloads stay in an error state and do not render product navigation. The `FeatureFlagRegistry` returns `false` for unknown flags. `NavigationRegistry` filters disabled routes, disabled flags, unsupported capabilities, and items whose route is not enabled.

`RouteRegistry` is a compiled allow-list. The backend can select a `screen_key`
and a browser path from `ui.routes`, but it cannot inject React code. Unknown
screens resolve to a not-available state and are omitted from active navigation.
API paths are resolved separately from `apiRoutes`.

Design tokens are accepted only for known CSS custom properties and expected token types. Values containing CSS execution primitives such as `url(...)`, `expression(...)`, braces, or semicolons are ignored. The frontend never treats arbitrary token keys as CSS property names.

The manifest contains `label_key` rather than localized label text. The web
`LabelRegistry` resolves approved keys to local copy; unknown keys are omitted
from navigation. Capability checks remain deny-by-default until an authenticated
frontend subject adapter exists.
