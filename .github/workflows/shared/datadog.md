---
network:
  allowed:
    - "*.datadoghq.com"
    - "*.datadoghq.eu"
    - "*.ddog-gov.com"
observability:
  otlp:
    endpoint:
      - url: ${{ secrets.GH_AW_OTEL_DATADOG_ENDPOINT || format('https://otlp-intake.{0}/v1/traces', secrets.DD_SITE || 'datadoghq.com') }}
        headers:
          DD-API-KEY: ${{ secrets.GH_AW_OTEL_DATADOG_API_KEY || secrets.DD_API_KEY }}
    if-missing: ignore
---

<!--
## Optional secrets

When present, these enable OTLP fan-out to Datadog:

- `GH_AW_OTEL_DATADOG_ENDPOINT` optional; defaults to `https://otlp-intake.${DD_SITE}/v1/traces`
- `GH_AW_OTEL_DATADOG_API_KEY` optional; falls back to `DD_API_KEY`
- `DD_API_KEY` optional fallback when `GH_AW_OTEL_DATADOG_API_KEY` is not set
- `DD_SITE` optional; defaults to `datadoghq.com`
-->