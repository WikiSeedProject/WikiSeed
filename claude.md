# WikiSeed Project Context

## Mission
Preserve all Wikimedia database dumps (with non-English non-Wikipedia projects prioritized) via monthly torrents with Internet Archive webseeds.

## Architecture
**Single-machine Docker deployment** on Proxmox host
- **Scraper**: Discovers dumps via Wikimedia Enterprise API
- **Downloader**: Chunked downloads (100MB) with resume capability  
- **Creator**: Generates single monthly torrent with IA webseeds
- **Seeder**: Persistent seeding
- **Uploader**: Files to Internet Archive, torrents to Academic Torrents
- **Web UI**: Private config/monitoring dashboard
- **Database**: SQLite for tracking and metrics

## Storage Management
- **Thresholds**: 95% cleanup trigger & queue pause, 10GB safety margin
- **Golden Rule**: Never delete only copy of any project+language
- **Organization**: Hard links for multi-torrent inclusion without duplication
- **Cleanup Priority**: Multiple copies → large projects with many seeds → older dumps

## Download Process
1. Parse dumpstatus.json for file sizes and checksums
2. Check available storage before download
3. Download in 100MB chunks with resume capability
4. Verify against Wikimedia checksums (retry once if failed)
5. Failed downloads: 3 retries, then 24-hour retry queue

## Torrent Strategy
**Single monthly torrent structure:**
```
Wikimedia-Complete-YYYY-MM/
├── wikipedia/
│   ├── en/[files]
│   ├── es/[files]
│   └── ...
├── wiktionary/
│   ├── en/[files]
│   └── ...
└── checksums.txt
```

**Workflow:**
1. Wait for all monthly dumps (4-6 days after first of month)
2. Upload each file individually to Internet Archive
3. Create single torrent with IA URLs as webseeds
4. Upload torrent to Academic Torrents
5. Begin seeding

## Distribution
- **Priority**: Internet Archive (files) → Academic Torrents (torrent)
- **Tracking**: DHT queries for real torrent health stats
- **Retry**: Exponential backoff for failed uploads

## Configuration
- **Storage**: SQLite database, YAML config files
- **Management**: Web UI with live editing and auto-backup restore points
- **Hot-reload**: Bandwidth limits, thresholds (no restart needed)
- **Graceful restarts**: Wait for current chunk to finish

## Monitoring
- **Private**: Web UI dashboard with SQLite metrics
- **Public**: Third-party status page (StatusPage.io style)
- **Tracking**: DHT torrent health, storage usage, download progress
- **Alerts**: Storage full, failed downloads, missing language statistics

## Development Phases
1. **Foundation**: API discovery, download manager, SQLite tracking
2. **Torrent Management**: IA uploads, torrent creation with webseeds, DHT tracking
3. **Distribution**: Academic Torrents integration, retry mechanisms
4. **Web Interface**: Configuration dashboard, monitoring
5. **Automation**: Scheduling, error handling, optimization

---

## Removable Sections for Focused Chats

### API/Discovery Work
Keep: Mission, Architecture (Scraper), Download Process (step 1)

### Download Manager
Keep: Mission, Architecture (Downloader), Storage Management, Download Process

### Torrent Creation  
Keep: Mission, Torrent Strategy, Architecture (Creator)

### Internet Archive Integration
Keep: Mission, Torrent Strategy (workflow), Architecture (Uploader), Distribution

### Web UI Development
Keep: Mission, Architecture (Web UI), Configuration, Monitoring (Private)

### Status Page Integration
Keep: Mission, Architecture overview, Monitoring (Public)

### General Debugging/Architecture
Keep: Full document