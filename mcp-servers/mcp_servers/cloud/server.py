"""Cloud MCP server — real AWS CloudWatch metrics when credentials are configured."""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("cloud")


def _cloudwatch_client():
    import boto3

    return boto3.client(
        "cloudwatch",
        region_name=os.environ.get("AWS_REGION", "us-east-1"),
    )


@mcp.tool()
def get_metrics(
    namespace: str,
    metric_name: str,
    dimension_name: str = "ServiceName",
    dimension_value: str = "",
    period_seconds: int = 300,
    hours_back: int = 1,
) -> str:
    """Fetch CloudWatch metric datapoints for a service."""
    try:
        cw = _cloudwatch_client()
        end = datetime.now(timezone.utc)
        start = end - timedelta(hours=hours_back)
        dimensions = []
        if dimension_value:
            dimensions = [{"Name": dimension_name, "Value": dimension_value}]

        resp = cw.get_metric_statistics(
            Namespace=namespace,
            MetricName=metric_name,
            Dimensions=dimensions,
            StartTime=start,
            EndTime=end,
            Period=period_seconds,
            Statistics=["Average", "Maximum"],
        )
        points = [
            {
                "timestamp": p["Timestamp"].isoformat(),
                "average": p.get("Average"),
                "maximum": p.get("Maximum"),
            }
            for p in resp.get("Datapoints", [])
        ]
        points.sort(key=lambda x: x["timestamp"])
        return json.dumps({"metric": metric_name, "namespace": namespace, "values": points})
    except Exception as e:
        return json.dumps({"error": str(e), "hint": "Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or use IAM role"})


@mcp.tool()
def get_instance_health(instance_id: str) -> str:
    """Check EC2 instance status via AWS API."""
    try:
        import boto3

        ec2 = boto3.client("ec2", region_name=os.environ.get("AWS_REGION", "us-east-1"))
        resp = ec2.describe_instance_status(InstanceIds=[instance_id])
        statuses = resp.get("InstanceStatuses", [])
        if not statuses:
            return json.dumps({"instance_id": instance_id, "healthy": False, "reason": "not found"})
        st = statuses[0]
        healthy = st.get("InstanceStatus", {}).get("Status") == "ok"
        return json.dumps(
            {
                "instance_id": instance_id,
                "healthy": healthy,
                "instance_status": st.get("InstanceStatus"),
                "system_status": st.get("SystemStatus"),
            }
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


if __name__ == "__main__":
    mcp.run()
