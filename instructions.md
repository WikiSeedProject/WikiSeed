# WikiSeed Project Instructions

## Project Overview

**Goal**: Preserve the entirety of Wikimedia for future generations, with special focus on preserving smaller language projects that are often overlooked by other backup initiatives.

**Mission**: Ensure at least one copy of every Wikimedia project in every language is preserved and widely distributed through torrent networks.

## System Architecture

### Deployment Strategy
- **Platform**: Run directly on Proxmox host (no VM)
- **Containerization**: Docker containers for each component
- **Storage**: Direct access to 13TB local storage
- **Target**: Single-machine deployment with maximum I/O performance

### Container Architecture
```
┌─────────────────────────────────────┐
│ WikiSeed Ecosystem                  │
├─────────────┬──────────┬────────────┤
│   Scraper   │Downloader│  Creator   │
├─────────────┼──────────┼────────────┤
│   Seeder    │ Sharing  │   Web UI   │
├─────────────┴──────────┴────────────┤
│         PostgreSQL Database         │
└─────────────────────────────────────┘
```

**Container Responsibilities:**
- **Scraper**: Discovers new dumps via Wikimedia Enterprise Snapshot API (https://enterprise.wikimedia.com/docs/snapshot/)
- **Downloader**: Handles file downloads with resume capability
- **Creator**: Generates torrents, readmes, and groupings
- **Seeder**: Persistent torrent seeding (`restart: unless-stopped`)
- **Sharing**: Uploads to torrent sites (Academic Torrents, Internet Archive, RSS, custom sites)
- **Web UI**: Configuration dashboard and monitoring
- **Database**: PostgreSQL for tracking, metrics, and state

## Storage & Download Management

### Storage Strategy
- **Auto-detection**: Monitor filesystem usage in real-time
- **Storage thresholds**:
  - Queue pause: 90% (stop new downloads)
  - Cleanup trigger: 85% (start cleanup process)
  - Safety margin: 5GB always free
- **File organization**: Hard links for multi-torrent inclusion without duplication

### Download Logic
- **Processing**: FIFO (First In, First Out) as dumps become available
- **Pre-download checks**: Calculate file size vs. available space
- **Smart queuing**: Complete active downloads, pause queued when storage full
- **Auto-resume**: Resume queued downloads after cleanup frees space
- **Size verification**: Parse dumpstatus.json for accurate file sizes

### Preservation Rules
- **Golden Rule**: Never delete the only copy of any project+language combination
- **Cleanup priority**:
  1. Multiple copies of same project+language (keep newest)
  2. Large projects with many seeds (EN Wikipedia with >50 seeds)
  3. Older dumps when newer available
- **Protection**: Always maintain at least one copy regardless of age

## Error Handling & Recovery

### Download Protection
- **Resume capability**: HTTP range requests for interrupted downloads
- **Mirror Utilization**: Utilize avaliable Wikimedia Dump mirrors along with wikimedia.org
- **Chunked downloads**: download in 100MB segments 
- **File verification**: Compare against Wikimedia checksums after download
- **Automatic retry**: Re-download failed files (max 3 attempts per file)

### Upload Error Handling
- **Post-upload verification**: Check Internet Archive file integrity
- **Automatic retry**: Re-upload failed uploads with exponential backoff
- **Per-file quarantine**: Skip problematic files, retry next cycle
- **Continue operations**: Don't let one bad file stop everything

### Integrity Verification
- **Checksum validation**: Verify all files against official Wikimedia checksums
- **Torrent integrity**: Include checksums.txt (with file source and archive links) in every torrent
- **Source archival**: Archive dump status pages to archive.ph for long-term verification via archive.ph API

## Torrent Strategy
Utilize webseeds from wikimedia and other mirrors, along with Internet Archive

### Grouping System
Create multiple logical groupings using hard links (no file duplication):

#### Temporal Groupings
- **Monthly**: `"Wikimedia Complete - [Month Year]"` (current dumps)
- **Quarterly**: `"Wikimedia Q[1-4] [Year]"` (quarterly collections)
- **History dumps**: `"Wikimedia Complete with History - [H1/H2] [Year]"` (twice yearly)

#### Project-Based Groupings
Auto-discovered from dump.wikimedia.org:
- `"Wikipedia All Languages - [Month Year]"`
- `"Wiktionary All Languages - [Month Year]"`
- `"Wikibooks All Languages - [Month Year]"`
- `"Wikinews All Languages - [Month Year]"`
- `"Wikiquote All Languages - [Month Year]"`
- `"Wikisource All Languages - [Month Year]"`
- `"Wikiversity All Languages - [Month Year]"`
- `"Wikivoyage All Languages - [Month Year]"`

#### Language-Based Groupings
Based on Wikipedia article statistics from https://commons.wikimedia.org/wiki/Data:Wikipedia_statistics/data.tab

**Individual Languages:**
- `"[lang_code] ([English Name] - [Native Name]) Wikimedia Complete - [Month Year]"`
- Examples:
  - `"en (English) Wikimedia Complete - June 2025"`
  - `"es (Spanish - Español) Wikimedia Complete - June 2025"`
  - `"zh (Chinese - 中文) Wikimedia Complete - June 2025"`

**Language Tiers:**
- **Major Languages**: 500,000+ articles
- **Medium Languages**: 50,000-499,999 articles  
- **Small Languages**: <50,000 articles
- Named as: `"Major/Medium/Small Languages Wikimedia - [Month Year]"`

### Torrent Content Structure
```
torrent_name/
├── [dump_files...]
└── checksums.txt
```

**checksums.txt format:**
```
# WikiSeed Torrent Checksums - June 2025
# Torrent Generated: 2025-06-15 14:30 UTC
# https://github.com/WikiSeedProject/WikiSeed
# Verified against official Wikimedia checksums

SHA1(enwiki-20250601-pages-articles.xml.bz2)= abc123...
MD5(enwiki-20250601-pages-articles.xml.bz2)= def456...
Source: https://dumps.wikimedia.org/enwiki/20250601/
Archive: https://archive.ph/abc123
Status JSON: https://dumps.wikimedia.org/enwiki/20250601/dumpstatus.json
JSON Archive: https://archive.ph/def456
```

## Distribution Strategy

### Sharing Sites
- **Academic Torrents**: Primary academic distribution
- **Internet Archive**: File uploads for archival, also used as webseed for torrent
- **Wikimedia Torrent List**: Edit and update https://meta.wikimedia.org/wiki/Data_dump_torrents
- **RSS feeds**: For automated discovery
- **Custom sites**: User-configurable with custom APIs

### Upload Process
1. Create torrent file
2. Begin seeding locally
3. Upload to configured sharing sites via API
4. Monitor torrent health across sites

## Monitoring & Metrics

### Self-Contained Monitoring
- **Database storage**: All metrics in PostgreSQL
- **Web UI dashboard**: Built-in charts and monitoring for private web UI
- **Public Status Page**: Intergrate with cloud based status page provider and show status on https://wikiseed.app. everything else is private (LAN) web UI

### Persistent Metrics
- **Preservation stats**: Total data, unique projects, files preserved
- **Torrent health**: Seeders, peers, leachers 
- **System performance**: Download speeds, storage usage, success rates
- **Operation logs**: Structured logging with 90-day retention

### Reporting
- **Periodic reports**: Weekly summaries, monthly comprehensive reports
- **Export formats**: Web UI viewing + CSV export
- **Report contents**: Preservation progress, system health, torrent statistics

## Configuration Management

### Dual Configuration System
- **Config files**: YAML configuration for all settings
- **Web UI**: Live editing with immediate validation
- **Easy changes**: All settings adjustable without reinstallation

### Configuration Categories
1. **Storage Management**: Thresholds, cleanup rules, safety margins
2. **Language Configuration**: Article count tiers, grouping preferences
3. **Torrent Groupings**: Enable/disable each grouping strategy
4. **Sharing Sites**: Platform selection and custom site APIs
5. **Performance**: Bandwidth limits, scheduling, resource allocation
6. **Discovery**: New project detection frequency and handling

### Change Management
- **Graceful restarts**: Complete pending operations before container restart
- **Web UI feedback**: Show which containers will restart and wait times
- **Validation**: Check all settings before applying changes

## Future-Proofing

### Adaptive Systems
- **Auto-discovery**: Weekly scans via API of dump.wikimedia.org for new projects
- **Format agnostic**: Download and preserve any file format Wikimedia provides
- **Silent operation**: Automatically include new projects without user intervention
- **Dynamic groupings**: Automatically include new projects in torrent groupings

### Update Management
- **Automatic migration**: Database schema updates handled during WikiSeed updates
- **Version management**: Clean upgrade path for WikiSeed installations
- **No compatibility mode**: Forward-only approach leveraging Wikimedia's stable structure
- **Import/Export Config**: Automated backing up of config files

### Language Statistics
- **Monthly refresh**: Update language tiers from Wikimedia statistics (https://commons.wikimedia.org/wiki/Data:Wikipedia_statistics/data.tab) at month start
- **Configurable discovery**: Adjustable scan frequency for new projects
- **Cache strategy**: Cache statistics locally between monthly updates

## Default Configuration Template

**"Everything" Template** (recommended defaults):
- All grouping strategies enabled
- All sharing sites enabled 
- Conservative storage thresholds (85% cleanup, 90% pause)
- No bandwidth limits
- Weekly project discovery
- Maximum preservation coverage
- 90-day log retention

## Technical Stack

### Backend
- **Language**: Python
- **Frameworks**: Flask/FastAPI for API, APScheduler for tasks
- **Database**: PostgreSQL
- **Containerization**: Docker with docker-compose

### Frontend
- **Framework**: React
- **Design**: Responsive for mobile/desktop
- **Charts**: Chart.js for metrics visualization
- **No external CDNs**: Self-contained for offline operation

### Infrastructure
- **Deployment**: Docker containers on Proxmox host
- **Storage**: Direct mount to 13TB local storage
- **Networking**: Container networking with port exposure for local web UI and webhooks(?) for public status page
- **Persistence**: Docker volumes for database and configuration

## Development Phases

### Phase 1: Foundation
- Project structure and repository setup
- Wikimedia dump discovery API implementation
- Download manager with resume capability
- Database schema and basic tracking

### Phase 2: Core Functionality
- Internet Archive upload integration
- Torrent generation and hard-link management
- Torrent distribution system
- CLI interface for testing and validation

### Phase 3: Web Interface
- Configuration dashboard implementation
- Status monitoring and metrics display
- Responsive design for mobile/desktop access
- Public status page for transparency

### Phase 4: Automation & Polish
- Scheduling system with configurable discovery
- Error handling and recovery systems
- Performance optimization and resource management
- Comprehensive documentation completion

### Phase 5: Deployment & Community
- Docker deployment packaging
- Installation guides and user documentation
- Community contribution guidelines
- v1.0 release preparation

## Success Metrics

### Primary Goals
- **Completeness**: At least one copy of every Wikimedia project+language
- **Availability**: High torrent health across all shared torrents
- **Automation**: Minimal manual intervention required
- **Reliability**: Robust error handling and recovery

### Key Performance Indicators
- **Coverage**: Percentage of available Wikimedia dumps preserved
- **Distribution**: Number of active seeders across all torrents
- **Efficiency**: Storage utilization and cleanup effectiveness
- **Community**: Adoption rate and user contribution to seeding network