# Explore Blend (alpha)
This is an early version of a Looker extension that allows explore users to blend explores together, choose join paths, and perform custom calculations (custom dimensions, custom measures and table calculations) on top of the result. It's an advanced version of merge results that lets an end user do joins on the full explore queries. 

> **Important:** 
>
> *use_sql_runner* permission
>
> There are two important caveats to this Looker extension. 
> 1. The user using the extension needs to have `use_sql_runner` to perform the blending tasks. 
> 2. If the user wants to share the blended queries on dashboards or looks, the end users all need the `use_sql_runner` permission.


> **Note**
> 
> *single connection* mode
>
> The extension only supports blending explores from the same connection. The connection used is chosen from the first explore. To change the connection you need to reset the user interface

## Dialect Support
- BigQuery (beta)
- Postgres (beta)

## TODOs

### Critical Bugs
- Fix join deletion bug: When adding two joins and deleting the first join, an error occurs
- Implement validation in `JoinRow` to prevent duplicate `to_field` usage

### Join Management
- Implement join order validation and enforcement
  - Queries must be joined in a valid dependency order
  - Options:
    1. (Preferred) Auto-determine required join order based on relationships
    2. (Simple) Use sidepanel order as join order (don't let a user select fields from later joins)
- Extend join support beyond BigQuery/Postgres (Snowflake next? Will any changes need to be made?)

### Query Management
- Filter explore list to show only explores from the current connection
- Implement query duplication functionality
- Add query deletion capability, makes sure it also removes the joins
- Handle large query display with proper scrolling behavior

### URL/State Management
- Restore blend from saved SQL using -- b=sql_query_id

### UI Improvements
- Enhance dashboard functionality:
  - Improve dashboard picker interface
  - Add dashboard title saving capability
- Add loading indicators to interactive buttons
- Handle scroll behavior for large selected queries

TODO:
/config field validation for things like snake_case for model names and user attribute