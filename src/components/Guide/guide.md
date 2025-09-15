# Explore Blend (alpha)
This is an early version of a Looker extension that allows explore users to blend explores together, choose join paths, and perform custom calculations (custom dimensions, custom measures and table calculations) on top of the result. It's an alternative version of merge results that lets an end user do joins on the full explore queries. 

There are two modes, one that will use Looker's SQL runner to perform the blending and one that will use the LookML to perform the blending. To turn on the LookML mode, navigate to `/config` of the extension to set the properties.

> **Note:** 
>
> *use_sql_runner* permission is required if you have not enabled the lookml writer
>
> There are two important caveats to this Looker extension. 
> 1. The user using the extension needs to have `use_sql_runner` to perform the blending tasks. 
> 2. If the user wants to share the blended queries on dashboards or looks, the end users all need the `use_sql_runner` permission.


> **Note**
> 
> *single connection required*
>
> The extension only supports blending explores from the same connection. The connection used is chosen from the first explore. To change the connection you need to reset the user interface

## Universal Connection Mode

When enabled, the extension operates in a simplified mode where all blended explores must use the same database connection. Instead of mapping each connection to a separate model, you specify a single model name that will be used for all blends. This setting will be infrequently used unless you know that all your Looker connections have access to the same datasets; however it can be very useful if you've set it up this way so you can blend across all connections.

### Configuration

To enable collapse connection mode:

1. Open up the extension settings
2. Enable "Use LookML" if not already enabled
3. Under "Connection Mode", select "Universal Connection"
4. Enter a "Collapse Connection Model Name" (e.g., `blended_explores`)
5. Save the configuration

When collapse connection mode is disabled, the extension uses "Seperate Connections" mode where each database connection can be mapped to its own model name.

## Dialect Support
- BigQuery (beta)
- Postgres (beta)

**We will support all dialects that Looker supports, but we ask you reach out to your Looker account team and we'll prioritize your request.**