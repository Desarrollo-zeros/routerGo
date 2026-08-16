# CMS foundation

T041 defines the CMS boundary without coupling content policy to HTTP or
PostgreSQL. `ContentEntry` owns a versioned editorial lifecycle:

`DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED`

Versions are append-only while content is editable. Once a version is approved,
the aggregate rejects new versions until it returns to an editable state. Media
is represented by validated metadata (`storageKey`, MIME type, size, checksum);
binary storage and delivery belong to a future adapter.

Persistence consumes `CmsContentRepository`. T042 adds authenticated Studio
views and T043 adds audited operator workflows; neither concern belongs in the
domain aggregate.
