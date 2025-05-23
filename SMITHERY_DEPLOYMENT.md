# Smithery Deployment Guide

This guide explains how to deploy your Sipgate MCP server to Smithery.

## Prerequisites

1. A Smithery account
2. Your repository connected to Smithery
3. Sipgate API credentials (TOKEN_ID and TOKEN)

## Configuration Files

This repository includes the required Smithery configuration files:

- `Dockerfile` - Defines how to build the server container
- `smithery.yaml` - Specifies how to start and run the server using STDIO transport

## Server Configuration

When configuring your server in Smithery, you'll need to provide:

- **Sipgate Token ID** - Your Sipgate API token ID
- **Sipgate Token** - Your Sipgate API token

The `smithery.yaml` file automatically configures these as environment variables (`SIPGATE_TOKEN_ID` and `SIPGATE_TOKEN`) when starting the server.

## Configuration Schema

The server uses a STDIO-based MCP configuration with the following schema:

```yaml
startCommand:
  type: stdio
  configSchema:
    type: object
    properties:
      tokenId:
        type: string
        title: "Sipgate Token ID"
        description: "Your Sipgate API Token ID"
      token:
        type: string
        title: "Sipgate Token"
        description: "Your Sipgate API Token"
    required:
      - tokenId
      - token
```

## Deployment Steps

1. **Connect Repository**: Connect this GitHub repository to your Smithery account
2. **Configure Server**: 
   - Set the base directory (if needed)
   - Add the configuration schema above
   - Set environment variables
3. **Deploy**: Trigger a deployment from Smithery
4. **Test**: Use the Smithery interface to test your MCP server

## Local Testing

Before deploying, test your server locally:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Test with MCP Inspector
npm run inspector
```

## Server Features

This MCP server provides the following tools and resources:

### Tools
- `get_account_info` - Get sipgate account information
- `get_phone_numbers` - List phone numbers
- `send_sms` - Send SMS messages
- `initiate_call` - Make phone calls
- `get_call_history` - Retrieve call history
- `get_user_info` - Get user information
- `get_devices` - List account devices

### Resources
- `sipgate://account` - Account information
- `sipgate://numbers` - Phone numbers
- `sipgate://history` - Call history
- `sipgate://devices` - Device list

## Transport Support

The server uses STDIO transport for MCP communication:
- **Local development**: Uses stdio transport via command line
- **Smithery deployment**: Uses stdio transport in containerized environment
- **Configuration**: Credentials passed via environment variables set by Smithery

## Troubleshooting

1. **Build fails**: Ensure your Dockerfile builds locally first
2. **Server won't start**: Check that tokenId and token are provided in Smithery configuration
3. **API errors**: Verify your Sipgate credentials are valid and have the necessary permissions
4. **Configuration issues**: Ensure both tokenId and token fields are filled in the Smithery UI
5. **Runtime errors**: Check the server logs in Smithery for detailed error messages

For more help, consult the [Smithery documentation](https://docs.smithery.ai/).