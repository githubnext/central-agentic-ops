---
network:
  allowed:
    - "*.grafana.net"
observability:
  otlp:
    endpoint:
      - url: ${{ secrets.GH_AW_OTEL_GRAFANA_ENDPOINT }}
        headers:
          Authorization: ${{ secrets.GH_AW_OTEL_GRAFANA_AUTHORIZATION }}
    if-missing: ignore
---

<!--
## Optional secrets

When present, these enable OTLP fan-out to Grafana:

- `GH_AW_OTEL_GRAFANA_ENDPOINT`
- `GH_AW_OTEL_GRAFANA_AUTHORIZATION`
-->