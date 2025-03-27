# Explore Blend (alpha)
This is an early version of a Looker extension that allows end users of looker to

> [!NOTE]
> This is a note.

## TODOs

### Critical Bugs
- Fix join deletion bug: When adding two joins and deleting the first join, an error occurs
- Fix search functionality implementation
- Implement validation in `JoinRow` to prevent duplicate `to_field` usage

### Join Management
- Implement join order validation and enforcement
  - Queries must be joined in a valid dependency order
  - Options:
    1. (Preferred) Auto-determine required join order based on relationships
    2. (Simple) Use sidepanel order as join order
- Extend join support beyond BigQuery
- Verify complete `IJoin` objects and query usage in `BlendButton`

### Query Management
- Filter explore list to show only explores from the current connection
- Implement query duplication functionality
- Add query deletion capability
- Handle large query display with proper scrolling behavior

### URL/State Management
- Implement search params persistence:
  - Save and initialize query IDs
  - Save and restore join configurations

### UI Improvements
- Enhance dashboard functionality:
  - Improve dashboard picker interface
  - Add dashboard title saving capability
- Add loading indicators to interactive buttons
- Handle scroll behavior for large selected queries