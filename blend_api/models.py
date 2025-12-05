import os
from datetime import datetime, timezone
from enum import Enum
from typing import List, Literal, Optional, Self, Set, Union, cast, get_args

from pydantic import BaseModel, Field, SecretStr, model_validator
from structlog import get_logger
from werkzeug import Request

logger = get_logger()

TUserAttributeKeys = Literal[
    "personal_access_token", "client_secret", "webhook_secret", "client_id"
]


class RequestHeaders(BaseModel):
    host_origin: str | None = Field(default=None, alias="HTTP_X_BASE_URL")
    webhook_secret: SecretStr | None = Field(
        default=None, alias="HTTP_X_WEBHOOK_SECRET"
    )
    personal_access_token: SecretStr | None = Field(
        default=None, alias="HTTP_X_PERSONAL_ACCESS_TOKEN"
    )
    client_id: str | None = Field(
        default=None,
        alias="HTTP_X_CLIENT_ID",
    )
    client_secret: SecretStr | None = Field(
        default=None,
        alias="HTTP_X_CLIENT_SECRET",
    )

    @classmethod
    def from_request(cls, request: Request) -> Self:
        if hasattr(request, "headers") and hasattr(request.headers, "environ"):
            c = cls.model_validate(request.headers.environ)
            c.load_env()
            return c
        else:
            return cls.model_validate({})

    def log(self, type: Literal["info", "warning", "error"]) -> None:
        logger[type]("request_info", **self.model_dump())

    def unfilled_user_attribute_value(self, key: TUserAttributeKeys) -> str | None:
        value = getattr(self, key)
        if value is None:
            return None
        if type(value) is SecretStr:
            value = value.get_secret_value()
        if not isinstance(value, str):
            return None

        if value.startswith("{{") and value.endswith("}}"):
            return value.replace("{{", "").replace("}}", "")
        else:
            return None

    @property
    def unfilled_webhook_secret(self) -> str | None:
        return self.unfilled_user_attribute_value("webhook_secret")

    @property
    def unfilled_personal_access_token(self) -> str | None:
        return self.unfilled_user_attribute_value("personal_access_token")

    @property
    def unfilled_client_id(self) -> str | None:
        return self.unfilled_user_attribute_value("client_id")

    @property
    def unfilled_client_secret(self) -> str | None:
        return self.unfilled_user_attribute_value("client_secret")

    def load_env(self) -> None:
        if not self.client_id:
            self.client_id = os.environ.get("LOOKERSDK_CLIENT_ID")
        if not self.client_secret:
            self.client_secret = SecretStr(
                os.environ.get("LOOKERSDK_CLIENT_SECRET") or ""
            )
        if not self.host_origin:
            self.host_origin = os.environ.get("LOOKERSDK_BASE_URL")
        if not self.webhook_secret:
            self.webhook_secret = SecretStr(
                os.environ.get("LOOKERSDK_WEBHOOK_SECRET") or ""
            )
        if not self.personal_access_token:
            self.personal_access_token = SecretStr(
                os.environ.get("PERSONAL_ACCESS_TOKEN") or ""
            )

    def user_attribute_in_value(
        self,
        key: Literal[
            "personal_access_token", "client_secret", "webhook_secret", "client_id"
        ],
    ) -> str | None:
        value = getattr(self, key)
        if value is None:
            return None
        if type(value) is SecretStr:
            value = value.get_secret_value()
        if not isinstance(value, str):
            return None

        if value.startswith("{{"):
            return value.replace("{{", "").replace("}}", "")
        return None

    @property
    def is_valid(self) -> bool:
        return all(self.model_dump().values())


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
    query_alias: str | None = Field(default=None)
    name: str = Field(
        pattern=r"^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)?$"
    )  # Validates lookml field pattern
    sql_alias: str
    label_short: str
    view_label: str
    group_label: str = Field(default="")
    description: str = Field(default="")
    type: TDimensionFieldType | TMeasureFieldType
    create_measure: bool = Field(default=False)
    field_type: Literal["dimension", "measure"] = Field(default="dimension")

    @model_validator(mode="after")
    def set_query_alias(self) -> Self:
        if self.query_alias is None:
            self.query_alias = self.query_uuid
        return self

    @property
    def uuid_or_alias(self) -> str:
        return self.query_alias if self.query_alias else self.query_uuid

    @property
    def alias(self) -> str:
        return self.name.replace(".", "_")

    @property
    def dimension_name(self) -> str:
        return self.uuid_or_alias + "." + self.alias

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
        if self.type.startswith("date_"):
            if self.type in [
                "date_month_num",
                "date_year",
                "date_day_of_month",
                "date_day_of_week_index",
                "date_day_of_year",
                "date_fiscal_month_num",
                "date_fiscal_year",
                "date_hour_of_day",
                "date_week_of_year",
            ]:
                return "number"
            elif self.type == "date_date":
                return "date"
            elif self.type == "date_time":
                return "date_time"
            else:
                return "string"

        if self.type in {
            arg for t in get_args(TDimensionFieldType) for arg in get_args(t)
        }:
            return cast(TDimensionFieldType, self.type)
        elif self.type in get_args(TMeasureOnlyFieldType):
            if self.type in {
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
            }:
                return "number"
            elif self.type in {
                "percent_of_previous",
                "percent_of_total",
                "percentile",
                "percentile_distinct",
                "running_total",
            }:
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
    add_access_grant: bool = Field(default=False)
    dry_run: bool = Field(default=False)

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

    @property
    def explore_url(self) -> str:
        return f"/explore/{self.lookml_model}/{self.name}"

    @property
    def explore_id(self) -> str:
        return f"{self.lookml_model}::{self.name}"
