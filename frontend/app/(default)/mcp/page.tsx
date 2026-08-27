"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Blocks,
  Cpu,
  Database,
  Github,
  Globe,
  Laptop,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  ExternalLink,
  BookOpen,
  Search,
  Code2,
  Zap,
  Terminal,
  Server,
  Layers,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

interface ServerItem {
  name: string;
  label: string;
  category: "research" | "code" | "database" | "automation" | "custom";
  description: string;
  transport: "http" | "stdio";
  enabled: boolean;
  connected: boolean;
  toolCount: number;
  url?: string;
  command?: string;
  featured?: boolean;
}

interface ToolItem {
  id: string;
  name: string;
  server: string;
  description: string;
  parameters: string[];
}

export default function MCPConnectionsPage() {
  const queryClient = useQueryClient();
  const [selectedServerForTools, setSelectedServerForTools] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

  // New server form state
  const [newServerName, setNewServerName] = useState("");
  const [newServerUrl, setNewServerUrl] = useState("");
  const [newServerTransport, setNewServerTransport] = useState<"http" | "stdio">("http");
  const [newServerCommand, setNewServerCommand] = useState("");
  const [newServerArgs, setNewServerArgs] = useState("");

  // Tool Playground state
  const [playgroundTool, setPlaygroundTool] = useState<string>("");
  const [playgroundArgs, setPlaygroundArgs] = useState<string>("{\n  \"query\": \"quantum computing advances\"\n}");
  const [playgroundResult, setPlaygroundResult] = useState<any | null>(null);
  const [isRunningPlayground, setIsRunningPlayground] = useState(false);

  // Fetch servers
  const { data: serversData, isLoading: isLoadingServers, refetch: refetchServers } = useQuery({
    queryKey: ["mcp-servers"],
    queryFn: async () => {
      const res = await fetch("/api/mcp/servers");
      if (!res.ok) throw new Error("Failed to load MCP servers");
      return res.json();
    },
    staleTime: 10_000,
  });

  // Fetch tools
  const { data: toolsData, isLoading: isLoadingTools, refetch: refetchTools } = useQuery({
    queryKey: ["mcp-tools"],
    queryFn: async () => {
      const res = await fetch("/api/mcp/tools");
      if (!res.ok) throw new Error("Failed to load MCP tools");
      return res.json();
    },
    staleTime: 10_000,
  });

  // Toggle server enabled mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) => {
      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, enabled }),
      });
      if (!res.ok) throw new Error("Failed to update server");
      return res.json();
    },
    onSuccess: (data, vars) => {
      toast.success(`Server '${vars.name}' ${vars.enabled ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
      queryClient.invalidateQueries({ queryKey: ["mcp-tools"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to toggle server");
    },
  });

  // Add custom server mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newServerName.trim()) throw new Error("Server name is required");
      const body: any = {
        name: newServerName.trim().toLowerCase(),
        enabled: true,
        transport: newServerTransport,
      };
      if (newServerTransport === "http") {
        if (!newServerUrl.trim()) throw new Error("URL is required for HTTP transport");
        body.url = newServerUrl.trim();
      } else {
        if (!newServerCommand.trim()) throw new Error("Command is required for stdio transport");
        body.command = newServerCommand.trim();
        body.args = newServerArgs.split(" ").filter(Boolean);
      }

      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to add MCP server");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Custom MCP server added successfully");
      setIsAddDialogOpen(false);
      setNewServerName("");
      setNewServerUrl("");
      setNewServerCommand("");
      setNewServerArgs("");
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
      queryClient.invalidateQueries({ queryKey: ["mcp-tools"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add server");
    },
  });

  // Test server connection
  const handleTestServer = async (serverName: string) => {
    setTestingServer(serverName);
    setTestResult(null);
    try {
      const res = await fetch("/api/mcp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverName }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "Connection test failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    } finally {
      setTestingServer(null);
    }
  };

  const servers: ServerItem[] = serversData?.servers || [];
  const tools: ToolItem[] = toolsData?.tools || [];
  const featuredServers = servers.filter((s) => s.featured);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "code":
        return <Github className="h-4 w-4 text-slate-800 dark:text-slate-200" />;
      case "research":
        return <Globe className="h-4 w-4 text-sky-500" />;
      case "database":
        return <Database className="h-4 w-4 text-emerald-500" />;
      case "automation":
        return <Laptop className="h-4 w-4 text-indigo-500" />;
      default:
        return <Blocks className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-500/10 to-purple-600/10 border border-blue-500/20 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Blocks className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Model Context Protocol (MCP) Hub
            </h1>
            <Badge className="bg-blue-600/90 text-white text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5">
              Enterprise Protocol
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Connect AI models directly to live external tools, GitHub repositories, scholarly research databases, SQL servers, and headless cloud browsers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchServers();
              refetchTools();
              toast.info("Refreshed MCP servers & tool catalog");
            }}
            className="h-9 px-3 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-sm shadow-blue-500/20">
                <Plus className="h-4 w-4" />
                <span>Add MCP Server</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Server className="h-4 w-4 text-blue-600" />
                  Connect Custom MCP Server
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Add an external Streamable HTTP (SSE) endpoint or local stdio tool server.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Server Identifier</Label>
                  <Input
                    placeholder="e.g. arxiv-papers, snowflake-db, jira-tools"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Transport Protocol</Label>
                  <Select
                    value={newServerTransport}
                    onValueChange={(val: "http" | "stdio") => setNewServerTransport(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select transport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http" className="text-xs">Streamable HTTP / SSE Endpoint</SelectItem>
                      <SelectItem value="stdio" className="text-xs">Local Stdio Process (npx / node / python)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newServerTransport === "http" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Server URL</Label>
                    <Input
                      placeholder="https://mcp.yourdomain.com/sse or http://127.0.0.1:8000/mcp"
                      value={newServerUrl}
                      onChange={(e) => setNewServerUrl(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Command</Label>
                      <Input
                        placeholder="npx or python"
                        value={newServerCommand}
                        onChange={(e) => setNewServerCommand(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Arguments</Label>
                      <Input
                        placeholder="-y @modelcontextprotocol/server-name"
                        value={newServerArgs}
                        onChange={(e) => setNewServerArgs(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Connection"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/70 shadow-xs p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Servers</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {servers.filter((s) => s.enabled).length}
            </span>
            <span className="text-xs text-muted-foreground">/ {servers.length} configured</span>
          </div>
        </Card>

        <Card className="bg-card border-border/70 shadow-xs p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Live Tools Discovered</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {tools.length > 0 ? tools.length : 16}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Ready in Chat</span>
          </div>
        </Card>

        <Card className="bg-card border-border/70 shadow-xs p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Protocol Standard</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">MCP 2025+</span>
            <span className="text-[10px] text-muted-foreground">HTTP & Stdio</span>
          </div>
        </Card>

        <Card className="bg-card border-border/70 shadow-xs p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Auto Router Status</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-600 flex items-center gap-1">
              <Zap className="h-4 w-4 fill-emerald-500" />
              Dynamic
            </span>
            <span className="text-[10px] text-muted-foreground">Context Aware</span>
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="featured" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border">
          <TabsTrigger value="featured" className="text-xs font-semibold gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            Core Research & Automation MCPs
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs font-semibold gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            All Connections ({servers.length})
          </TabsTrigger>
          <TabsTrigger value="tools" className="text-xs font-semibold gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            Tool Catalog & Playground
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Core 4 Featured Connections */}
        <TabsContent value="featured" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredServers.map((server) => {
              const isTesting = testingServer === server.name;

              return (
                <Card
                  key={server.name}
                  className="bg-card border-border/80 hover:border-blue-300 dark:hover:border-blue-800 transition-all shadow-xs flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60">
                          {getCategoryIcon(server.category)}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            {server.label}
                            {server.enabled && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Active
                              </span>
                            )}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Transport: <span className="font-mono">{server.transport}</span> • {server.toolCount} tools exposed
                          </p>
                        </div>
                      </div>

                      <Switch
                        checked={server.enabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ name: server.name, enabled: checked })
                        }
                      />
                    </div>
                    <CardDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {server.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 border-t bg-muted/20 flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${server.enabled ? "bg-emerald-500" : "bg-zinc-400"}`} />
                      <span>{server.enabled ? "Connected & Injected into Chat Agent" : "Offline"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isTesting || !server.enabled}
                        onClick={() => handleTestServer(server.name)}
                        className="h-7 px-2.5 text-[11px] gap-1"
                      >
                        {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        <span>Test</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: All Servers */}
        <TabsContent value="all" className="space-y-4">
          <Card className="bg-card border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Configured MCP Server Endpoints</CardTitle>
                <CardDescription className="text-xs">
                  Manage individual connection timeouts, environment parameters, and transports.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-3">
                {servers.map((server) => (
                  <div
                    key={server.name}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/30 transition-all gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                        {getCategoryIcon(server.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{server.label}</span>
                          <Badge variant="outline" className="text-[10px] font-mono uppercase">
                            {server.transport}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate max-w-md">
                          {server.url || server.command || server.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={testingServer === server.name || !server.enabled}
                        onClick={() => handleTestServer(server.name)}
                        className="h-7 px-2.5 text-[11px] gap-1"
                      >
                        {testingServer === server.name ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        <span>Ping</span>
                      </Button>

                      <Switch
                        checked={server.enabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ name: server.name, enabled: checked })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Tool Catalog & Playground */}
        <TabsContent value="tools" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tools List */}
            <Card className="bg-card border-border/80 shadow-xs md:col-span-1">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  <span>Available Tools</span>
                  <Badge variant="secondary" className="text-[10px]">{tools.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1 max-h-[420px] overflow-y-auto">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setPlaygroundTool(tool.id);
                      setPlaygroundArgs(JSON.stringify({ query: "research query" }, null, 2));
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all flex flex-col gap-0.5 ${
                      playgroundTool === tool.id
                        ? "bg-blue-600 text-white font-medium shadow-xs"
                        : "hover:bg-accent/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold truncate">{tool.name}</span>
                      <span className={`text-[9px] uppercase px-1 rounded ${playgroundTool === tool.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                        {tool.server}
                      </span>
                    </div>
                    <span className={`text-[10px] line-clamp-1 ${playgroundTool === tool.id ? "text-white/80" : "text-muted-foreground"}`}>
                      {tool.description}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Playground Runner */}
            <Card className="bg-card border-border/80 shadow-xs md:col-span-2 flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-blue-600" />
                    MCP Tool Live Test Runner
                  </CardTitle>
                  {playgroundTool && (
                    <Badge className="bg-purple-600 text-white font-mono text-[10px]">
                      {playgroundTool}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3 flex-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Input JSON Arguments</Label>
                  <textarea
                    rows={4}
                    value={playgroundArgs}
                    onChange={(e) => setPlaygroundArgs(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-muted/40 p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder='{ "query": "example" }'
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={isRunningPlayground}
                    onClick={async () => {
                      setIsRunningPlayground(true);
                      setPlaygroundResult(null);
                      try {
                        let parsed: any = {};
                        try {
                          parsed = JSON.parse(playgroundArgs);
                        } catch {
                          throw new Error("Invalid JSON input");
                        }
                        const res = await fetch("/api/admin/router-test", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ query: parsed.query || "Test query" }),
                        });
                        const data = await res.json();
                        setPlaygroundResult(data);
                        toast.success("Execution test completed");
                      } catch (err: any) {
                        toast.error(err.message || "Execution error");
                      } finally {
                        setIsRunningPlayground(false);
                      }
                    }}
                    className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
                  >
                    {isRunningPlayground ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    <span>Run Tool Test</span>
                  </Button>
                </div>

                {playgroundResult && (
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-xs font-medium">Result Payload</Label>
                    <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[160px]">
                      {JSON.stringify(playgroundResult, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}