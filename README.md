# Plant Platform Architecture v3

## Vision

A unified industrial application platform where every installation runs the same software. Role configuration determines capabilities. Works offline-first, syncs when connected. Includes a low-code builder that generates real Next.js applications.

---

## 1. Core Concepts

### Same Software, Different Roles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PLATFORM SOFTWARE                                  │
│                      (Single Application Image)                             │
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌────────────────────────────┐      │
│   │ STANDALONE  │    │   GATEWAY   │    │          MANAGER           │      │
│   │             │    │             │    │                            │      │
│   │ Single-site │    │ Connects to │    │ Accepts gateway connections│      │
│   │ No network  │    │ upstream    │    │ Aggregates all sites       │      │
│   │             │    │ manager     │    │ Pushes configs down        │      │
│   └─────────────┘    └─────────────┘    └────────────────────────────┘      │
│                                                                             │
│   All roles include:                                                        │
│   • Tag system with real-time data                                          │
│   • Connection management                                                   │
│   • Low-code app builder (generates Next.js)                                │
│   • Alarming (edge-triggered)                                               │
│   • User management                                                         │
│   • Module system                                                           │
│   • Full API access                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Network Topology

```
                         ┌─────────────────────┐
                         │      MANAGER        │
                         │                     │
                         │ • Aggregated tags   │
                         │ • Merged alarms     │
                         │ • All apps synced   │
                         │ • User source       │
                         └──────────┬──────────┘
                                    │
                                    │ Outbound connections only
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    GATEWAY      │      │    GATEWAY      │      │    GATEWAY      │
│   (Chicago)     │      │   (Berlin)      │      │   (Tokyo)       │
│                 │      │                 │      │                 │
│ • Local tags    │      │ • Local tags    │      │ • Local tags    │
│ • Local alarms  │      │ • Local alarms  │      │ • Local alarms  │
│ • Local apps    │      │ • Local apps    │      │ • Local apps    │
│ • Works offline │      │ • Works offline │      │ • Works offline │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         ▼                        ▼                        ▼
    Plant Floor              Plant Floor              Plant Floor
   (PLCs, MQTT)             (PLCs, MQTT)             (PLCs, MQTT)
```

---

## 3. Tag System

### Overview

Tags are the fundamental data model. All industrial data flows through tags.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TAG ARCHITECTURE                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DATA SOURCES                      TAG DATABASE              CONSUMERS      │
│                                                                             │
│  ┌──────────┐                    ┌─────────────┐                            │
│  │   PLC    │──────┐             │             │         ┌──────────────┐   │
│  │ (Modbus) │      │             │             │    ┌───►│  Browser UI  │   │
│  └──────────┘      │             │             │    │    └──────────────┘   │
│                    │             │    Redis    │    │                       │
│  ┌──────────┐      ├────────────►│   (Real-    │────┤    ┌──────────────┐   │
│  │   PLC    │      │             │    time)    │    ├───►│   Alarms     │   │
│  │  (S7)    │──────┤             │             │    │    └──────────────┘   │
│  └──────────┘      │             │             │    │                       │
│                    │             │             │    │    ┌──────────────┐   │
│  ┌──────────┐      │             └─────────────┘    ├───►│  Historian   │   │
│  │  Kafka   │──────┤                                │    └──────────────┘   │
│  │          │      │                                │                       │
│  └──────────┘      │                                │    ┌──────────────┐   │
│                    │                                └───►│   Scripts    │   │
│  ┌──────────┐      │                                     └──────────────┘   │
│  │   MQTT   │──────┘                                                        │
│  │          │                                                               │
│  └──────────┘                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tag Structure

```
Tags have hierarchical paths:
  Site / Area / Line / Device / Point

Example:
  Chicago / Assembly / Line1 / Robot1 / JointTemperature

Tag properties:
  • Path (unique identifier)
  • Data type (bool, int, float, string)
  • Source (connection + address)
  • Engineering units
  • Scaling (raw → engineering)
  • Description
  • Alarm config (optional)
  • Historize (optional)
```

### Tag Structure Templates (TST)

For repeating equipment, define templates:

```yaml
# Example: Robot template
templates:
  - id: robot-arm
    name: Robot Arm
    description: Standard 6-axis robot
    tags:
      - path: JointTemperature
        type: float
        units: °C
        alarm:
          high: 80
          highHigh: 95
          
      - path: CycleCount
        type: int
        historize: true
        
      - path: Status
        type: int
        enum:
          0: Idle
          1: Running
          2: Faulted

# Usage: instantiate at path
instances:
  - template: robot-arm
    path: Chicago/Assembly/Line1/Robot1
    source:
      connection: line1-plc
      baseAddress: DB100
      
  - template: robot-arm
    path: Chicago/Assembly/Line1/Robot2
    source:
      connection: line1-plc
      baseAddress: DB200
```

### Redis as Tag Store

Redis runs embedded in the platform:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHY REDIS                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  • Sub-millisecond reads/writes                                             │
│  • Pub/Sub for real-time subscriptions                                      │
│  • Built-in TTL for stale data detection                                    │
│  • Lightweight, embeddable                                                  │
│  • Proven in industrial (Ignition uses similar pattern)                     │
│                                                                             │
│  Embedded by default, can point to external Redis cluster for HA            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Real-Time Data Flow

### WebSocket Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REAL-TIME DATA FLOW                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BROWSER AT GATEWAY (direct)                                                │
│  ─────────────────────────────                                              │
│                                                                             │
│  Browser ◄──── WebSocket ────► Gateway ◄──── Redis Pub/Sub                  │
│                                                                             │
│  1. Browser opens WS to gateway                                             │
│  2. Subscribes to tags: ["Line1/Robot1/Temp", "Line1/Robot2/Temp"]          │
│  3. Gateway subscribes to Redis channels                                    │
│  4. On tag change → push to browser                                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  BROWSER AT MANAGER (proxied)                                               │
│  ─────────────────────────────                                              │
│                                                                             │
│  Browser ◄──► Manager ◄──── Tunnel ────► Gateway ◄──► Redis                 │
│                                                                             │
│  1. Browser opens WS to manager                                             │
│  2. Subscribes to: ["Chicago/Line1/Robot1/Temp"]                            │
│  3. Manager parses site from path (Chicago)                                 │
│  4. Manager opens/reuses WS through tunnel to Chicago gateway               │
│  5. Gateway subscribes to Redis                                             │
│  6. Data flows: Redis → Gateway → Tunnel → Manager → Browser                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Subscription Protocol

```typescript
// Client → Server
{ "type": "subscribe", "tags": ["Chicago/Line1/Robot1/Temp"] }
{ "type": "unsubscribe", "tags": ["Chicago/Line1/Robot1/Temp"] }

// Server → Client
{ "type": "values", "data": { "Chicago/Line1/Robot1/Temp": { "value": 42.5, "quality": "good", "timestamp": 1704067200 } } }
{ "type": "error", "tag": "Chicago/Line1/Robot1/Temp", "error": "Tag not found" }
```

---

## 5. Low-Code App Builder

### Concept

The builder generates real Next.js code, not interpreted runtime configs.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  APP BUILDER                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Visual Editor                    Generated Output                          │
│  ─────────────                    ────────────────                          │
│                                                                             │
│  ┌─────────────────────────┐     ┌─────────────────────────────────────┐    │
│  │  Canvas with widgets    │     │  /apps/my-dashboard/                │    │
│  │  ┌─────┐ ┌─────┐        │     │    ├── page.tsx                     │    │
│  │  │Gauge│ │Chart│        │ ──► │    ├── components/                  │    │
│  │  └─────┘ └─────┘        │     │    │   ├── TempGauge.tsx            │    │
│  │  ┌───────────────┐      │     │    │   └── TrendChart.tsx           │    │
│  │  │    Table      │      │     │    ├── hooks/                       │    │
│  │  └───────────────┘      │     │    │   └── useTagSubscription.ts    │    │
│  └─────────────────────────┘     │    └── app.config.yaml              │    │
│                                  └─────────────────────────────────────┘    │
│  Features:                                                                  │
│  • Drag/drop widgets (gauges, charts, tables, buttons, inputs)              │
│  • Bind to tags via tag browser                                             │
│  • JavaScript scripting for logic                                           │
│  • Multiple screens with navigation                                         │
│  • Generates real, editable Next.js code                                    │
│  • Can eject and customize in VS Code                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### App Storage & Sync

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  APP STORAGE                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Apps can be created at:                                                    │
│  • Manager (central)                                                        │
│  • Any Gateway (local)                                                      │
│                                                                             │
│  All apps sync to manager as source of truth                                │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  SYNC SCENARIOS                                                             │
│                                                                             │
│  Normal: Gateway A creates app → syncs to Manager → pushed to Gateway B     │
│                                                                             │
│  Conflict: Gateway A and B both edit same app while offline                 │
│                                                                             │
│    Gateway A (offline)        Manager           Gateway B (offline)         │
│    ──────────────────         ───────           ──────────────────          │
│    Edit app v1 → v2a                            Edit app v1 → v2b           │
│         │                                              │                    │
│         └──────────► Reconnect ◄───────────────────────┘                    │
│                          │                                                  │
│                     CONFLICT DETECTED                                       │
│                          │                                                  │
│                     ┌────┴────┐                                             │
│                     │ Options │                                             │
│                     └────┬────┘                                             │
│                          │                                                  │
│              ┌───────────┼───────────┐                                      │
│              ▼           ▼           ▼                                      │
│          Keep A      Keep B     Keep Both                                   │
│                                 (rename one)                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### JavaScript Scripting

Scripts run in sandboxed environment:

```javascript
// Example: Calculated tag
export function calculate(tags) {
  const temp1 = tags['Line1/Robot1/Temp'];
  const temp2 = tags['Line1/Robot2/Temp'];
  return (temp1 + temp2) / 2;
}

// Example: Button action
export async function onButtonClick(context) {
  const { tags, api, navigate } = context;
  
  await api.writeTag('Line1/Robot1/Command', 1);
  await api.callService('notifications', 'send', {
    message: 'Robot started'
  });
  
  navigate('/status');
}

// Example: Conditional visibility
export function isVisible(tags) {
  return tags['System/Mode'] === 'manual';
}
```

---

## 6. Alarms

### Edge-Triggered, Manager-Aggregated

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ALARM ARCHITECTURE                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Alarms are TRIGGERED at the edge (low latency, works offline)              │
│  Alarms are AGGREGATED at the manager (unified view)                        │
│                                                                             │
│                              ┌─────────────┐                                │
│                              │   MANAGER   │                                │
│                              │             │                                │
│                              │ All alarms  │                                │
│                              │ from all    │                                │
│                              │ sites       │                                │
│                              └──────┬──────┘                                │
│                                     │                                       │
│                    Merge alarm folders                                      │
│                                     │                                       │
│         ┌───────────────────────────┼───────────────────────────┐           │
│         │                           │                           │           │
│         ▼                           ▼                           ▼           │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐      │
│  │  Gateway A  │            │  Gateway B  │            │  Gateway C  │      │
│  │             │            │             │            │             │      │
│  │ Tag changes │            │ Tag changes │            │ Tag changes │      │
│  │     │       │            │     │       │            │     │       │      │
│  │     ▼       │            │     ▼       │            │     ▼       │      │
│  │ Alarm eval  │            │ Alarm eval  │            │ Alarm eval  │      │
│  │     │       │            │     │       │            │     │       │      │
│  │     ▼       │            │     ▼       │            │     ▼       │      │
│  │ Local alarm │            │ Local alarm │            │ Local alarm │      │
│  │ state + log │            │ state + log │            │ state + log │      │
│  └─────────────┘            └─────────────┘            └─────────────┘      │
│                                                                             │
│  Alarm definition lives with tag (in tag config or TST)                     │
│  Alarm states: Normal → Active → Acknowledged → Normal                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. User Management

### Flexible User Sources

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER SOURCES                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Built-in Options:                                                          │
│  • Local (users stored in platform database)                                │
│  • LDAP / Active Directory                                                  │
│  • SAML 2.0                                                                 │
│  • OIDC / OAuth 2.0                                                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  EDGE AUTHENTICATION OPTIONS                                                │
│                                                                             │
│  Option A: Through Manager                                                  │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐                       │
│  │  Browser   │────►│  Gateway   │────►│  Manager   │────► User Source      │
│  └────────────┘     └────────────┘     └────────────┘                       │
│                                                                             │
│  • Gateway proxies auth to manager                                          │
│  • Manager connects to user source                                          │
│  • Works when manager is reachable                                          │
│  • Offline: cached sessions valid for configurable period                   │
│                                                                             │
│  Option B: Direct to Source                                                 │
│  ┌────────────┐     ┌────────────┐                                          │
│  │  Browser   │────►│  Gateway   │────────────────────────► User Source     │
│  └────────────┘     └────────────┘                                          │
│                                                                             │
│  • Gateway connects directly to LDAP/SAML/OIDC                              │
│  • Doesn't require manager                                                  │
│  • Each gateway needs user source config                                    │
│                                                                             │
│  Choice configured per gateway in platform.yaml                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Permissions Model

```
Roles (built-in):
  • Viewer     — Read tags, view apps
  • Operator   — Viewer + acknowledge alarms, write allowed tags
  • Engineer   — Operator + edit apps, configure tags
  • Admin      — Full access

Scopes:
  • Global     — Access to all sites
  • Site       — Access to specific site(s)
  • App        — Access to specific app(s)

Example:
  User "john" has role "Operator" scoped to site "Chicago"
  → Can view/operate Chicago, cannot see Berlin
```

---

## 8. Connections

### Configuration

Connections are configured in UI or YAML:

```yaml
# connections.yaml
connections:
  - id: line1-plc
    name: Line 1 PLC
    type: modbus
    config:
      host: 192.168.1.50
      port: 502
      unitId: 1
    scope: synced  # or "local"
    
  - id: plant-mqtt
    name: Plant MQTT Broker
    type: mqtt
    config:
      broker: mqtt://192.168.1.100:1883
      username: platform
      password: ${MQTT_PASSWORD}
    scope: local
    
  - id: corporate-kafka
    name: Corporate Kafka
    type: kafka
    config:
      brokers:
        - kafka1.corp.internal:9092
        - kafka2.corp.internal:9092
    origin: manager  # Pushed from manager, read-only at gateway
```

### Supported Connection Types (Core)

| Type | Protocol | Direction |
|------|----------|-----------|
| modbus | Modbus TCP/RTU | Read/Write |
| opcua | OPC-UA | Read/Write/Subscribe |
| mqtt | MQTT 3.1.1/5.0 | Pub/Sub |
| kafka | Kafka | Pub/Sub |
| s7 | Siemens S7 | Read/Write |
| http | REST API | Request/Response |

Additional protocols available via marketplace modules.

---

## 9. API

### Design Principle

**Every function in the platform is accessible via API.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  API SURFACE                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  REST API (CRUD operations)                                                 │
│  ─────────────────────────                                                  │
│  GET    /api/tags                    List tags                              │
│  GET    /api/tags/:path              Get tag value                          │
│  PUT    /api/tags/:path              Write tag value                        │
│  GET    /api/alarms                  List active alarms                     │
│  POST   /api/alarms/:id/acknowledge  Acknowledge alarm                      │
│  GET    /api/connections             List connections                       │
│  GET    /api/apps                    List apps                              │
│  ...                                                                        │
│                                                                             │
│  WebSocket API (real-time)                                                  │
│  ─────────────────────────                                                  │
│  /ws/tags                            Tag subscriptions                      │
│  /ws/alarms                          Alarm state changes                    │
│  /ws/events                          System events                          │
│                                                                             │
│  Authentication                                                             │
│  ──────────────                                                             │
│  • API keys (for service integrations)                                      │
│  • JWT tokens (for user sessions)                                           │
│  • OAuth 2.0 (for third-party apps)                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Configuration as Code

```
/config
  platform.yaml       # Role, networking, embedded services
  connections.yaml    # All connection definitions
  tags.yaml           # Tag definitions and templates
  users.yaml          # Local users (if using local auth)
  apps.yaml           # App deployment config
  modules.yaml        # Enabled modules
```

All files:
- Version controllable (Git)
- Hot-reloadable (most changes don't require restart)
- Validated on load (schema validation)
- Synced between gateway and manager (based on scope)

---

## 11. Embedded Services

### Default Stack (all embedded)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EMBEDDED BY DEFAULT                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   SQLite    │  │    Redis    │  │   Traefik   │  │     frp     │         │
│  │             │  │             │  │             │  │             │         │
│  │ Config DB   │  │ Tag store   │  │ Reverse     │  │ Tunnel      │         │
│  │ Audit log   │  │ Pub/Sub     │  │ proxy       │  │ client/     │         │
│  │ App state   │  │ Cache       │  │ SSL term    │  │ server      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                                             │
│  All run in-process or as managed sidecars                                  │
│  Zero external dependencies for quickstart                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Production Options

| Component | Embedded | External Option |
|-----------|----------|-----------------|
| Config DB | SQLite | Postgres, MySQL |
| Tag Store | Redis (embedded) | Redis Cluster |
| Proxy | Traefik (embedded) | External Traefik/Nginx |
| Tunnel | frp (embedded) | External frp server |

---

## 12. Module System

### Module Types

```
CONNECTORS                        MODULES (Features)
──────────                        ──────────────────
• Additional protocols            • Historian (enterprise)
• BACnet, Profinet, EtherNet/IP  • Advanced Alarming (enterprise)
• Custom integrations            • Recipe Management (enterprise)
                                 • Report Builder (enterprise)
                                 • OEE Tracking (marketplace)
```

### Free vs Enterprise

| Feature | Community | Enterprise |
|---------|-----------|------------|
| Core connectors (Modbus, OPC-UA, MQTT, S7) | ✓ | ✓ |
| Tag system + Redis | ✓ | ✓ |
| App builder | ✓ | ✓ |
| Basic alarming | ✓ | ✓ |
| Basic historian (7-day retention) | ✓ | ✓ |
| Advanced historian (unlimited) | | ✓ |
| Advanced alarming (escalation, schedules) | | ✓ |
| Recipe management | | ✓ |
| Audit trail | | ✓ |
| Multi-site dashboards | | ✓ |
| LDAP/SAML/OIDC | | ✓ |
| Priority support | | ✓ |

---

## 13. Licensing & Module Delivery

### Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LICENSING                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COMMUNITY (Free)           ENTERPRISE (Paid)        MARKETPLACE            │
│  ────────────────           ─────────────────        ───────────            │
│  • Core platform            • Everything free        • Third-party          │
│  • Basic features           • Enterprise modules       modules              │
│  • MIT licensed             • Priority support       • You take 20%         │
│  • Self-support             • Commercial license     • Vendor gets 80%      │
│                                                      • Payout after 14d     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module Delivery

```
CORE (Open Source)
  → Public registry (npm, GitHub)
  → Always included
  → MIT licensed

ENTERPRISE (Your Modules)  
  → Private registry (your infrastructure)
  → Downloaded when license activated
  → Code readable (legal protection only)

MARKETPLACE (Third-Party)
  → Your marketplace registry
  → Downloaded when purchased
  → Obfuscation required
```

### Module Compatibility

- Modules declare compatible core versions
- Incompatible modules shown in UI with warning
- Platform does not auto-update modules
- User must manually update modules after core update

---

## 14. Tunnel Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GATEWAY → MANAGER TUNNEL                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Gateway                                          Manager                   │
│  ───────                                          ───────                   │
│                                                                             │
│  frp client ──────── outbound TCP ──────────────► frp server                │
│      │                                                │                     │
│      │ Registers:                                     │ Routes:             │
│      │ • HTTP proxy                                   │ /sites/chicago/*    │
│      │ • WebSocket proxy                              │ /ws/chicago/*       │
│      │                                                │                     │
│      ▼                                                ▼                     │
│  Local services                                  Unified entry              │
│  • Apps (:3000)                                  • All sites                │
│  • API (:3001)                                   • Single domain            │
│  • WebSocket (:3002)                                                        │
│                                                                             │
│  Firewall: Only outbound required at gateway                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Tech Stack

| Layer | Technology |
|-------|------------|
| Application | Next.js 14+ |
| UI | React, Tailwind, shadcn/ui |
| API | REST + WebSocket |
| Config DB | SQLite / Postgres |
| Tag Store | Redis (embedded) |
| Runtime | Node.js 20+ |
| Containers | Docker |
| Tunnel | frp |
| Proxy | Traefik |

---

## 16. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PLC/MQTT/Kafka                                                             │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────┐                                                                │
│  │Connector│ (polls or subscribes)                                          │
│  └────┬────┘                                                                │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────┐                                                                │
│  │  Redis  │ (tag store + pub/sub)                                          │
│  └────┬────┘                                                                │
│       │                                                                     │
│       ├──────────────┬──────────────┬──────────────┐                        │
│       ▼              ▼              ▼              ▼                        │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐                      │
│  │Alarm Eng│   │Historian│   │WebSocket│   │ Scripts │                      │
│  │(evaluate│   │(store)  │   │(push to │   │(calc'd  │                      │
│  │ alarms) │   │         │   │ browser)│   │ tags)   │                      │
│  └────┬────┘   └─────────┘   └─────────┘   └─────────┘                      │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────┐                                                                │
│  │Manager  │ (aggregated alarms, tags, status)                              │
│  │via      │                                                                │
│  │tunnel   │                                                                │
│  └─────────┘                                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 17. Unified UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏭 Platform    [Chicago ▼]     Apps   Tags   Alarms   Config   Admin   👤  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Same navbar everywhere                                                     │
│  Site picker shows all sites (grayed if offline)                            │
│  Content area loads from selected site                                      │
│                                                                             │
│  At Manager: proxy through tunnel                                           │
│  At Gateway: serve locally, can switch if manager reachable                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 18. Deployment Modes

**Quickstart**
```bash
docker run -v ./data:/data ghcr.io/yourcompany/platform:latest
```
- Single container
- All services embedded
- SQLite + embedded Redis

**Production**
```yaml
# docker-compose.yml with external services
services:
  platform:
    image: ghcr.io/yourcompany/platform:latest
    environment:
      DATABASE_URL: postgres://...
      REDIS_URL: redis://...
```

**Air-Gapped**
- Download release bundle (includes all images)
- Copy modules manually to /modules
- License validated offline (periodic online check optional)

---

## 19. Summary

| Aspect | Decision |
|--------|----------|
| Software model | Same software, different roles |
| Networking | Outbound-only tunnels |
| Tag storage | Redis (embedded or external) |
| App builder | Generates real Next.js code |
| Scripting | JavaScript (sandboxed) |
| Alarms | Edge-triggered, manager-aggregated |
| Users | Flexible sources, configurable auth path |
| Config | YAML files, Git-friendly |
| API | Every function accessible |
| Licensing | Open core + enterprise + marketplace (20%) |
| Modules | Downloaded on license/purchase |