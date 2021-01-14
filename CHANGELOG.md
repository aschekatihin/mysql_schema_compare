## [0.0.11] /// 2021-01-14
### Added
- Views bodies are compared now
- New env variable FULL_DIFFS
- New env variable IGNORE_COMMENTS


## [0.0.9] /// 2019-09-25
### Added
- CREATE FUNCTION statement support added

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
