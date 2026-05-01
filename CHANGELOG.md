# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-05-01

### Fixed
- Add db-level locking for sequence increment operations to prevent race conditions (#15)

### Chore
- Added GitHub spec-kit specifications (#14)

## [1.0.1] - 2025-06-20

### Fixed
- Minor enhancements (#6)
- Documentation updates and fixes (#5)

## [1.0.0] - 2025-06-16

### Added
- Initial release of cds-numberrange-plugin
- Database-agnostic number range management for CAP framework
- Support for SQLite and SAP HANA databases
- Configurable prefix, suffix, padding, and increment options
- Draft and active creation modes