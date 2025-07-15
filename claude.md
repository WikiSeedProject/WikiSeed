# WikiSeed Project Instructions

## Project Overview

**Goal**: Preserve the entirety of Wikimedia for future generations.

**Mission**: Ensure at least one copy of every Wikimedia project in every language is preserved and widely distributed through torrent networks and the Internet Archive.

## System Architecture

### Deployment Strategy
- **Platform**: Run directly on Ubuntu server vm on Proxmox host
- **Containerization**: Docker containers for each component
- **Storage**: Direct access to 18TB local storage (configurable)
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
- **Controller**: Job orchestration, workflow management, resource coordination
- **Scraper**: Wiki discovery via https://commons.wikimedia.org/w/api.php?action=sitematrix&format=json, find dumps via dumps.wikimedia.org (or mirror)
- **Downloader**: File downloads with resume capability and mirror utilization, verifies checksum
- **Creator**: Torrent generation, text file creation (checksums.txt, sources.txt)
- **Seeder**: Persistent torrent seeding
- **Sharing**: Uploads to torrent sites (Academic Torrents, Internet Archive, RSS, custom sites)
- **wikiseed.app**: Public status page; will be hosted in cloud
- **Database**: PostgreSQL for tracking, metrics, and state

## Storage & Download Management

### Storage Strategy
- **Auto-detection**: Monitor filesystem usage in real-time
- **Storage thresholds**:
  - Queue pause: 90% (finish active downloads, stop new downloads)
  - Cleanup trigger: 85% (start cleanup process)
  - Safety margin: 5GB always free (hard stop active downloads)
- **File organization**: Same as torrent file orgnization

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
- **Chunked downloads**: 100MB segments with individual verification
- **Real-time verification**: Compare against Wikimedia checksums during download
- **Automatic retry**: Re-download failed chunks (max 3 attempts per chunk)

### Upload Error Handling
- **Post-upload verification**: Check Internet Archive file integrity
- **Automatic retry**: Re-upload failed uploads with exponential backoff
- **Per-file quarantine**: Skip problematic files, retry next cycle
- **Continue operations**: Don't let one bad file stop everything

### Integrity Verification
- **Checksum validation**: Verify all files against official Wikimedia checksums
- **Torrent integrity**: Include CHECKSUMS.txt and SOURCE_INFO.txt in every torrent
- **Source archival**: Archive dump status pages to archive.ph for long-term verification

## Torrent Strategy

### Grouping System
Create multiple logical groupings using hard links (no file duplication):

#### Temporal Groupings
- **Monthly**: `"Wikimedia Complete - [Month Year]"` (current dumps)
- **History dumps**: `"Wikimedia Complete with History - [Year]"` (Once yearly)

### Torrent Content Structure
```
torrent_name/
├── wikipedia/                  #project
│   ├── en                      #language
│    ── ├── [dump_files]
├── checksums.txt
├── legal.txt (based on https://dumps.wikimedia.org/legal.html)
└── sources.txt
```

**checksums.txt format:**
```
# WikiSeed Torrent Dump Checksums - June 2025
# https://wikiseed.app
# Generated: 2025-06-15 14:30 UTC
# WikiSeed version: 1.0
# WikiSeed GitHub: https://github.com/WikiSeedProject/WikiSeed

SHA1(enwiki-20250601-pages-articles.xml.bz2)= abc123...
MD5(enwiki-20250601-pages-articles.xml.bz2)= def456...
```

**sources.txt format:**
```
# WikiSeed Torrent Dump Sources - June 2025
# https://wikiseed.app
# Generated: 2025-06-15 14:30 UTC
# WikiSeed version: 1.0
# WikiSeed GitHub: https://github.com/WikiSeedProject/WikiSeed

Project: Wikipedia
Languauge: en
Source: https://dumps.wikimedia.org/enwiki/20250601/
Archive Source Page: https://archive.ph/abc123
Mirror used? Y/N
Mirror Source: https://dumps.wikimedia.your.org/enwiki/20220820/
Archive Mirror Source Page: https://archive.ph/hij789
Status JSON: https://dumps.wikimedia.org/enwiki/20250601/dumpstatus.json
Archived Stauts JSON: https://archive.ph/def456
```

## Distribution Strategy

### Sharing Sites
- **Academic Torrents**: Primary torrent distribution
- **Internet Archive**: File uploads for archival and webseed
- **RSS feeds**: For automated discovery

### Archive Process
1. Download all dumps
2. Compile files into torrent archive
3. Upload torrent archive to Internet Archive
4. Create torrent with IA as web seed
5. Begin seeding locally
6. Upload torrent file to configured sharing sites
7. Monitor torrent health across sites

## Monitoring & Metrics

### Self-Contained Monitoring
- **Database storage**: All metrics in PostgreSQL
- **Web UI dashboard**: Built-in charts and monitoring
- **No external dependencies**: Complete system within containers

### Persistent Metrics
- **Preservation stats**: Total data, unique projects, files preserved
- **Torrent health**: DHT, Seeders, peers, upload ratios per torrent
- **System performance**: Download/upload speeds, storage usage
- **Operation logs**: Structured logging with 90-day retention

### Reporting
- **Periodic reports**: Weekly summaries, monthly comprehensive reports
- **Export formats**: Web UI viewing + CSV export
- **Report contents**: Preservation progress, system health, torrent statistics

## Configuration Management

### Configuration System
- **Config files**: YAML configuration for all settings
- **Easy changes**: All settings adjustable without reinstallation

### Configuration Categories
**Storage Management**: Thresholds, cleanup rules, safety margins
**Performance**: Bandwidth limits, scheduling, resource allocation

### Change Management
- **Graceful restarts**: Complete pending operations before container restart
- **Web UI feedback**: Show which containers will restart and wait times
- **Validation**: Check all settings before applying changes

## Future-Proofing

### Adaptive Systems
- **Auto-discovery**: Weekly scans of https://wikistats.wmcloud.org/wikimedias_wiki.php for new projects
- **Format agnostic**: Download and preserve any file format Wikimedia provides
- **Silent operation**: Automatically include new projects without user intervention

### Update Management
- **Automatic migration**: Database schema updates handled during WikiSeed updates
- **Version management**: Clean upgrade path for WikiSeed installations

## Technical Stack

### Backend
- **Language**: Python
- **Frameworks**: Flask for API, APScheduler for tasks
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Migrations**: Alembic for database schema management
- **Containerization**: Docker with docker-compose

### Frontend
- **Framework**: React
- **Design**: Responsive for mobile/desktop
- **Charts**: Chart.js for metrics visualization
- **No external CDNs**: Self-contained for offline operation

### Infrastructure
- **Deployment**: Docker containers on Proxmox host
- **Networking**: Container networking with port exposure for web UI, torrents, downloads
- **Persistence**: Docker volumes for database and configuration

## Development Architecture

### Container-First Development Strategy

**Development Environment:**
- **Platform**: Mac development with Visual Studio Code
- **Repository**: GitHub with automated testing
- **Deployment**: Pull to Proxmox for production
- **Testing**: Automated testing and error handling from start

### Project Structure
```
wikiseed/
├── docker-compose.dev.yml      # Development environment
├── docker-compose.prod.yml     # Production deployment
├── shared/                     # Shared utilities, models, database
│   ├── __init__.py
│   ├── database.py            # Database connections, models
│   ├── models.py              # Job queue, dump tracking
│   └── utils.py               # Common functions
├── controller/                 # Orchestration container
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   └── tests/
├── scraper/                    # Wiki discovery & dump finding
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   └── tests/
├── downloader/                 # Download management
├── creator/                    # Torrent & file generation
├── seeder/                     # Torrent seeding
├── sharing/                    # Upload to torrent sites
├── webui/                      # Web interface
└── tests/                      # Integration tests
```

### Development Workflow
1. **GitHub repo**: Push changes to GitHub
2. **Mac development**: `docker-compose -f docker-compose.dev.yml up`
3. **Live reload**: Mount source code as volumes for instant updates
4. **Testing**: Each container has its own test suite
5. **Deployment**: Pull to Proxmox, run production compose

### Testing Strategy
```
tests/
├── unit/                       # Individual container tests
│   ├── test_controller.py
│   ├── test_scraper.py
│   ├── test_downloader.py
│   └── test_creator.py
├── integration/                # Cross-container tests
│   ├── test_workflow.py
│   └── test_error_handling.py
└── fixtures/                   # Test data
    ├── sample_dumps.json
    └── mock_responses/
```

## Controller + Database Foundation

### Database Design

**Framework Stack:**
- **SQLAlchemy**: Python ORM for database interactions
- **Alembic**: Database migration management
- **PostgreSQL**: Primary database with JSON support

### Controller Container Architecture

**Core Responsibilities:**
1. **Job Orchestration**: Create, assign, and monitor jobs across containers
2. **Workflow Management**: Coordinate scraper → downloader → creator → seeder → sharing pipeline
3. **Resource Management**: Prevent conflicts, manage storage thresholds
4. **Error Coordination**: Handle cross-container failures and retry logic
5. **Configuration Distribution**: Push config changes to relevant containers

**Controller Components:**
- **Job Manager**: Creates and assigns jobs based on workflow rules
- **Status Monitor**: Tracks container health and job progress
- **Config Manager**: Handles configuration changes and container restarts
- **Metrics Collector**: Gathers system-wide performance data
- **API Server**: Flask REST API for web UI and container communication

### Job Queue System Design

**Job Types:**
- `discover_wikis`: Scrape wikistats.wmcloud.org for active wikis
- `find_dumps`: Check dumps.wikimedia.org for specific wiki dumps
- `download_dump`: Download specific dump file with mirror utilization
- `create_torrent`: Generate torrent and text files
- `upload_ia`: Upload torrent to Internet Archive
- `start_seeding`: Begin seeding torrent
- `upload_sharing`: Upload to torrent sites

**Job State Machine:**
```
pending → assigned → in_progress → completed
    ↓         ↓           ↓
  failed ← failed ← failed (with retry logic)
```

**Job Assignment Logic:**
- Each container polls database for jobs of its type
- Controller assigns jobs based on container availability and resource constraints
- Automatic retry with exponential backoff for failed jobs
- Quarantine jobs after maximum retry attempts
- Priority system: FIFO with resource-based scheduling

### Inter-Container Communication

**Database Polling System:**
- Each container polls the `jobs` table for work
- Controller creates jobs and monitors overall workflow
- Shared database provides audit trail and coordination
- No complex message queues - simple and reliable

**Communication Flow:**
```
1. Scraper finds new dump → Creates "download_dump" job
2. Controller assigns job to available Downloader
3. Downloader polls, picks up job, downloads file
4. Downloader marks job complete → Creates "create_torrent" job
5. Controller assigns to Creator → Creator makes torrent
6. Creator completes → Creates "start_seeding" and "upload_sharing" jobs
7. Seeder and Sharing containers pick up respective jobs
```

**Controller Error Management:**
- **Job timeout handling**: Detect and reassign stuck jobs
- **Container health monitoring**: Track container responsiveness
- **Resource conflict prevention**: Avoid simultaneous operations on same files
- **Graceful degradation**: Continue operations when non-critical containers fail

**Database Connection Management:**
- **Connection pooling**: Efficient database connection usage
- **Retry logic**: Handle temporary database connectivity issues
- **Transaction management**: Ensure data consistency across operations
- **Backup coordination**: Coordinate with container operations

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