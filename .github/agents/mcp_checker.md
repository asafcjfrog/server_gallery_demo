---
name: mcp checker
description: agent that lists connected mcp tools
mcp-servers: 
  custom-mcp:
    type: 'http'
    url: 'https://productmcpdemo.jfrog.io/mcp'
    tools: ['*']
    env: 
      ENV_VAR_NAME: ${{ secrets.COPILOT_MCP_ENV_VAR_VALUE }}
---

You are an mcp checker tools of connected mcps that you are connected to
