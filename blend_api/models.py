from datetime import datetime, timezone
from enum import Enum
from typing import List, Literal, Optional, Set, Union, cast, get_args

from pydantic import BaseModel, Field
from structlog import get_logger

logger = get_logger()

TSharedFieldType = Literal[
    "date",
    "date_date",
    "number",
    "string",
    "yesno",
    "zipcode",
    "date_day_of_month",
    "date_day_of_week",
    "date_day_of_week_index",
    "date_day_of_year",
    "date_fiscal_month_num",
    "date_fiscal_quarter",
    "date_fiscal_quarter_of_year",
    "date_fiscal_year",
    "date_hour",
    "date_hour2",
    "date_hour3",
    "date_hour4",
    "date_hour6",
    "date_hour8",
    "date_hour12",
    "date_hour_of_day",
    "date_microsecond",
    "date_millisecond",
    "date_millisecond2",
    "date_millisecond4",
    "date_millisecond5",
    "date_millisecond8",
    "date_millisecond10",
    "date_millisecond20",
    "date_millisecond25",
    "date_millisecond40",
    "date_millisecond50",
    "date_millisecond100",
    "date_millisecond125",
    "date_millisecond200",
    "date_millisecond250",
    "date_millisecond500",
    "date_minute",
    "date_minute2",
    "date_minute3",
    "date_minute4",
    "date_minute5",
    "date_minute6",
    "date_minute10",
    "date_minute12",
    "date_minute15",
    "date_minute20",
    "date_minute30",
    "date_month",
    "date_month_name",
    "date_month_num",
    "date_quarter",
    "date_quarter_of_year",
    "date_raw",
    "date_second",
    "date_time",
    "date_time_of_day",
    "date_week",
    "date_week_of_year",
    "date_year",
]

# Dimension-specific types
TDimensionFieldType = Union[
    Literal[
        "bin",
        "distance",
        "location",
        "tier",
        "duration_day",
        "duration_hour",
        "duration_minute",
        "duration_month",
        "duration_quarter",
        "duration_second",
        "duration_week",
        "duration_year",
    ],
    TSharedFieldType,
]

TMeasureOnlyFieldType = Literal[
    "average",
    "average_distinct",
    "count",
    "count_distinct",
    "list",
    "max",
    "median",
    "median_distinct",
    "min",
    "percent_of_previous",
    "percent_of_total",
    "percentile",
    "percentile_distinct",
    "running_total",
    "sum",
    "sum_distinct",
]


class MeasureToMeasureEnum(Enum):
    count = "sum"
    sum = "sum"
    sum_distinct = "sum"
    list = "list"
    max = "max"
    min = "min"
    average = None
    average_distinct = None
    count_distinct = None
    median = None
    median_distinct = None
    percent_of_previous = None
    percent_of_total = None
    percentile = None
    percentile_distinct = None
    running_total = None


# Measure-specific types
TMeasureFieldType = Union[
    TMeasureOnlyFieldType,
    TSharedFieldType,
]


class AccessGrant(BaseModel):
    uuid: str
    user_attribute: str
    allowed_values: Set[str]

    @property
    def name(self) -> str:
        return f"access_grant_{self.uuid}"

    @property
    def explore_access_grant(self) -> str:
        return f"""  required_access_grants: [{self.name}]"""

    @property
    def access_grant(self) -> str:
        return f"""access_grant: {self.name} {{
  user_attribute: {self.user_attribute}
  allowed_values: [{", ".join(self.allowed_values)}]
}}"""


class BlendField(BaseModel):
    query_uuid: str
    name: str = Field(
        pattern=r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)?$"
    )  # Validates snake_case pattern with zero or one periods
    sql_alias: str
    label_short: str
    view_label: str
    group_label: str = Field(default="")
    description: str = Field(default="")
    type: TDimensionFieldType | TMeasureFieldType
    create_measure: bool = Field(default=False)
    field_type: Literal["dimension", "measure"] = Field(default="dimension")

    @property
    def alias(self) -> str:
        return self.name.replace(".", "_")

    @property
    def dimension_name(self) -> str:
        return self.query_uuid + "." + self.alias

    @property
    def sql(self) -> str:
        return "${TABLE}." + '"' + self.sql_alias + '"'

    @property
    def lookml(self) -> str:
        sql: str = "${TABLE}." + self.sql_alias
        out = ""
        if (
            self.create_measure
            and self.field_type == "measure"
            and self.forced_measure_type
        ):
            out += f"""  measure: {self.dimension_name} {{
    label: "{self.label_short}"
    view_label: "{self.view_label}"
    group_label: "{self.group_label}"
    description: "{self.description}"
    type: {self.forced_measure_type}
    sql: {sql} ;;
  }}
            """
        else:
            out += f"""  dimension: {self.dimension_name} {{
    label: "{self.label_short}"
    view_label: "{self.view_label}"
    group_label: "{self.group_label}"
    description: "{self.description}"
    type: {self.forced_dimension_type}
    sql: {sql} ;;
  }}
        """

        return out

    @property
    def forced_measure_type(self) -> TMeasureFieldType | None:
        if self.type in get_args(TMeasureOnlyFieldType):
            return MeasureToMeasureEnum[self.type].value

    @property
    def forced_dimension_type(self) -> TDimensionFieldType:
        if self.type in get_args(TDimensionFieldType):
            return cast(TDimensionFieldType, self.type)
        elif self.type in get_args(TMeasureOnlyFieldType):
            if self.type in [
                "average",
                "average_distinct",
                "median",
                "median_distinct",
                "sum",
                "sum_distinct",
                "max",
                "min",
                "count",
                "count_distinct",
            ]:
                return "number"
            elif self.type in [
                "percent_of_previous",
                "percent_of_total",
                "percentile",
                "percentile_distinct",
                "running_total",
            ]:
                logger.warning("Invalid measure only field type", type=self.type)
                return "string"
            else:
                logger.warning("Invalid measure only field type", type=self.type)
                return "string"
        else:
            logger.warning("Invalid field type", type=self.type)
            return "string"


class RequestBody(BaseModel):
    uuid: str = Field(pattern=r"^[a-z][a-z0-9_]*$")  # Validates snake_case pattern
    url: str
    fields: List[BlendField]
    sql: str
    explore_ids: Set[str]
    project_name: str
    user_attribute: str | None = None
    includes: str | None = None
    explore_label: str | None = None
    repo_name: str
    connection_name: str
    lookml_model: str = Field(
        pattern=r"^[a-z][a-z0-9_]*$"
    )  # Validates snake_case pattern
    user_commit_comment: str | None = Field(default=None)
    create_measures: bool = Field(default=False)

    @property
    def models(self) -> Set[str]:
        return set([explore.split("::")[0] for explore in self.explore_ids])

    @property
    def name(self) -> str:
        return f"blend_{self.uuid}"

    @property
    def label_explore(self) -> str:
        if self.explore_label:
            return self.explore_label
        else:
            return f"Blend {self.uuid}"

    def get_lookml(self, access_grant: Optional[AccessGrant] = None) -> str:
        out = f"# This file is automatically generated: {datetime.now(timezone.utc).isoformat()}\n"
        if self.user_commit_comment:
            out += f"# {self.user_commit_comment}\n"
        out += f"# URL: {self.url}/explore/{self.lookml_model}/{self.name}\n"
        if self.includes:
            out += f"""
include: "{self.includes}"
            """

        if access_grant:
            out += f"""
access_grant: access_grant_{access_grant.uuid} {{
    user_attribute: {access_grant.user_attribute}
    allowed_values: [{", ".join(access_grant.allowed_values)}]
}}
        """
        view = f"""
view: {self.name} {{
  derived_table: {{
    sql: {self.sql} ;;
  }}
{"\n".join(field.lookml for field in self.fields)}
}}
        """
        explore = f"""
explore: {self.name} {{
  hidden: yes
  label: "{self.label_explore}" {("\n" + access_grant.explore_access_grant) if access_grant else ""}
}}
"""
        out += view
        out += explore
        return out
