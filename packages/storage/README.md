# Storage

Shared S3-compatible private-object storage client for DigitalOcean Spaces. Uploads do not set a public ACL; callers receive short-lived signed download URLs instead of permanent object URLs. It contains no credentials or application authorization rules and can be reused by user and event services.
