
## [0.0.8] /// 2019-09-17
### Added
- ALTER TABLE statements initial support
- ALTER TABLE ADD FOREIGN KEY adds FK and corresponding auto index to resulting AST

## [0.0.6] /// 2019-09-16
### Fixed
- Fixed foreign keys auto index logic

## [0.0.5] /// 2019-09-16
### Added
- Triggers support added
- Stored procedures support added
### Fixed
- List of schema files loads properly
- Data types with unspecified width now default to correct value
