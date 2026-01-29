import { Agent, AgentStatus } from "@/generated/prisma";

export function getStatusFromDropdownValue(statusValue: string): AgentStatus | null {
  switch (statusValue.toLowerCase()) {
    case "pending":
      return AgentStatus.PENDING;
    case "failed":
      return AgentStatus.FAILED;
    case "ready":
      return AgentStatus.READY;
    case "inactive":
      return AgentStatus.INACTIVE;
    case "active":
      return AgentStatus.ACTIVE;
    default:
      return null;
  }
}

export function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case AgentStatus.ACTIVE:
      return "status.success.main";
    case AgentStatus.INACTIVE:
      return "status.error.main";
    case AgentStatus.PENDING:
      return "status.warning.main";
    case AgentStatus.FAILED:
      return "status.error.main";
    case AgentStatus.READY:
      return "status.success.main";
  }
}

export function getStatusBackground(status: AgentStatus): string {
  switch (status) {
    case AgentStatus.ACTIVE:
      return "status.success.bg";
    case AgentStatus.INACTIVE:
      return "status.error.bg";
    case AgentStatus.PENDING:
      return "status.warning.bg";
    case AgentStatus.FAILED:
      return "status.error.bg";
    case AgentStatus.READY:
      return "status.success.bg";
  }
}
export function getTimeFromDate(date: Date | string): string {
  const now = new Date();
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diff / 60000);
  const diffInHours = Math.floor(diff / 3600000);
  const diffInDays = Math.floor(diff / 86400000);

  if (diffInDays > 0) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  } else {
    return "Just now";
  }
}

export function getStatusFromLabel(label: string): AgentStatus {
  switch (label.toLowerCase()) {
    case "ready":
      return AgentStatus.READY;
    case "inactive":
      return AgentStatus.INACTIVE;
    case "pending":
      return AgentStatus.PENDING;
    case "failed":
      return AgentStatus.FAILED;
    case "active":
      return AgentStatus.ACTIVE;
    default:
      return AgentStatus.FAILED;
  }
}

export function getAgentTypes(agent: Agent): string[] {
  const types = [];
  if (agent.scrapingUrl) {
    types.push("Static");
  }
  if (agent.openApiUrl) {
    types.push("Dynamic");
  }
  return types;
}

export function getTypeBackgroundColor(type: string): string {
  switch (type.toLowerCase()) {
    case "static":
      return "tag.static.bg";
    case "dynamic":
      return "tag.dynamic.bg";
    default:
      return "tag.default.bg";
  }
}

export function getTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "static":
      return "tag.static.text";
    case "dynamic":
      return "tag.dynamic.text";
    default:
      return "tag.default.text";
  }
}

export function getStatusText(status: AgentStatus): string {
  switch (status) {
    case AgentStatus.ACTIVE:
      return "Active";
    case AgentStatus.INACTIVE:
      return "Inactive";
    case AgentStatus.PENDING:
      return "Pending";
    case AgentStatus.FAILED:
      return "Failed";
    case AgentStatus.READY:
      return "Ready";
  }
}
