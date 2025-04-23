#!/usr/bin/env node

/**
 * This is an MCP server that implements access to the sipgate API.
 * It provides tools and resources for interacting with sipgate services including:
 * - Account information
 * - Phone numbers and devices
 * - SMS messaging
 * - Call history and management
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { sipgateIO, createCallModule, createSMSModule, createHistoryModule, createNumbersModule, createDevicesModule } from "sipgateio";

// Get authentication credentials from environment variables
const TOKEN_ID = process.env.SIPGATE_TOKEN_ID || '';
const TOKEN = process.env.SIPGATE_TOKEN || '';

// Check if credentials are provided
if (!TOKEN_ID || !TOKEN) {
  throw new Error("SIPGATE_TOKEN_ID and SIPGATE_TOKEN environment variables are required");
}

/**
 * SipgateApiServer class that handles all the MCP server functionality
 */
class SipgateApiServer {
  private server: Server;
  private client: any;
  private callModule: any;
  private smsModule: any;
  private historyModule: any;
  private numbersModule: any;
  private devicesModule: any;
  private cachedResources: { [key: string]: any } = {};

  constructor() {
    this.server = new Server(
      {
        name: "sipgate-api-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize sipgate client with Personal Access Token
    this.client = sipgateIO({
      tokenId: TOKEN_ID as string,
      token: TOKEN as string,
    });

    // Initialize modules
    this.callModule = createCallModule(this.client);
    this.smsModule = createSMSModule(this.client);
    this.historyModule = createHistoryModule(this.client);
    this.numbersModule = createNumbersModule(this.client);
    this.devicesModule = createDevicesModule(this.client);

    this.setupResourceHandlers();
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Setup resource handlers for sipgate data
   */
  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "sipgate://account",
            mimeType: "application/json",
            name: "Account Information",
            description: "Information about your sipgate account"
          },
          {
            uri: "sipgate://numbers",
            mimeType: "application/json",
            name: "Phone Numbers",
            description: "List of phone numbers associated with your sipgate account"
          },
          {
            uri: "sipgate://history",
            mimeType: "application/json",
            name: "Call History",
            description: "Recent call history from your sipgate account"
          },
          {
            uri: "sipgate://devices",
            mimeType: "application/json",
            name: "Devices",
            description: "List of devices associated with your sipgate account"
          }
        ]
      };
    });

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      // Check if we have a cached version of this resource
      if (this.cachedResources[uri]) {
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(this.cachedResources[uri], null, 2)
          }]
        };
      }

      try {
        let data;
        
        if (uri === "sipgate://account") {
          // Get account information using direct API call
          const response = await this.client.get("/account");
          data = response;
        } 
        else if (uri === "sipgate://numbers") {
          // Get all phone numbers
          const numbers = await this.numbersModule.getAllNumbers();
          data = numbers;
        } 
        else if (uri === "sipgate://history") {
          // Get call history
          const history = await this.historyModule.fetchAll({ limit: 20 });
          data = history;
        } 
        else if (uri === "sipgate://devices") {
          const webuserId = await this.client.getAuthenticatedWebuserId();
          const devices = await this.devicesModule.getDevices(webuserId);
          data = devices;
        } 
        else {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Invalid URI: ${uri}`
          );
        }

        // Cache the data
        this.cachedResources[uri] = data;

        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2)
          }]
        };
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Sipgate API error: ${error.message}`
        );
      }
    });
  }

  /**
   * Setup tool handlers for sipgate operations
   */
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_account_info",
            description: "Get information about your sipgate account",
            inputSchema: {
              type: "object",
              properties: {},
              required: []
            }
          },
          {
            name: "get_phone_numbers",
            description: "Get a list of phone numbers associated with your sipgate account",
            inputSchema: {
              type: "object",
              properties: {},
              required: []
            }
          },
          {
            name: "send_sms",
            description: "Send an SMS message",
            inputSchema: {
              type: "object",
              properties: {
                smsId: {
                  type: "string",
                  description: "The SMS ID to use for sending (e.g., 's0')"
                },
                recipient: {
                  type: "string",
                  description: "The recipient's phone number in E.164 format (e.g., +4915123456789)"
                },
                message: {
                  type: "string",
                  description: "The message to send"
                }
              },
              required: ["smsId", "recipient", "message"]
            }
          },
          {
            name: "initiate_call",
            description: "Initiate a phone call",
            inputSchema: {
              type: "object",
              properties: {
                from: {
                  type: "string",
                  description: "The extension ID or phone number to use for calling (e.g., 'e0' or '+4915123456789')"
                },
                to: {
                  type: "string",
                  description: "The recipient's phone number in E.164 format"
                },
                callerId: {
                  type: "string",
                  description: "Optional caller ID to display to the recipient"
                }
              },
              required: ["from", "to"]
            }
          },
          {
            name: "get_call_history",
            description: "Get call history",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of entries to return (default: 10)"
                },
                types: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["CALL", "VOICEMAIL", "FAX", "SMS"]
                  },
                  description: "Types of entries to include"
                }
              },
              required: []
            }
          },
          {
            name: "get_user_info",
            description: "Get information about the authenticated user",
            inputSchema: {
              type: "object",
              properties: {},
              required: []
            }
          },
          {
            name: "get_devices",
            description: "Get a list of devices associated with your sipgate account",
            inputSchema: {
              type: "object",
              properties: {},
              required: []
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "get_account_info": {
            try {
              const response = await this.client.get("/account");
              const responseText = JSON.stringify(response, null, 2);
              return {
                content: [{
                  type: "text",
                  text: responseText
                }]
              };
            } catch (error: any) {
              throw new McpError(
                ErrorCode.InternalError,
                `Error getting account info: ${error.message}`
              );
            }
          }

          case "get_phone_numbers": {
            try {
              const numbers = await this.numbersModule.getAllNumbers();
              const responseText = numbers ? JSON.stringify(numbers, null, 2) : "No phone numbers available";
              return {
                content: [{
                  type: "text",
                  text: responseText
                }]
              };
            } catch (error: any) {
              throw new McpError(
                ErrorCode.InternalError,
                `Error getting phone numbers: ${error.message}`
              );
            }
          }

          case "send_sms": {
            try {
              const args = request.params.arguments as any;
              if (!args.recipient || !args.message) {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  "Missing required parameters: recipient and message are required"
                );
              }

              // Get WebUserID first
              const webuserId = await this.client.getAuthenticatedWebuserId();
              
              // Get SMS extensions
              const extensionsResponse = await this.client.get(`/${webuserId}/sms`);
              const smsExtensions = extensionsResponse.items || [];
              
              if (smsExtensions.length === 0) {
                throw new McpError(
                  ErrorCode.InternalError,
                  "No SMS extensions available for this account"
                );
              }

              // Use the first available SMS extension
              const smsExtension = smsExtensions[0];
              const debugInfo = `Debug Info:
Web User ID: ${webuserId}
Using SMS Extension: ${JSON.stringify(smsExtension, null, 2)}`;

              // Send SMS using the SMS module with the found extension
              const smsData = {
                smsId: smsExtension.id,
                to: args.recipient.replace(/\s+/g, ''), // Remove any whitespace
                message: args.message
              };

              try {
                await this.smsModule.send(smsData);
                return {
                  content: [{
                    type: "text",
                    text: `${debugInfo}\n\nSMS sent successfully to ${args.recipient}`
                  }]
                };
              } catch (smsError: any) {
                return {
                  content: [{
                    type: "text",
                    text: `${debugInfo}\n\nSMS Error: ${smsError.message}`,
                  }],
                  isError: true
                };
              }
            } catch (error: any) {
              throw new McpError(
                ErrorCode.InternalError,
                `SMS sending failed: ${error.message}`
              );
            }
          }

          case "initiate_call": {
            const args = request.params.arguments as any;
            if (!args.from || !args.to) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "Missing required parameters: from and to are required"
              );
            }

            const callData: any = {
              from: args.from,
              to: args.to
            };

            if (args.callerId) {
              callData.callerId = args.callerId;
            }

            await this.callModule.initiate(callData);

            return {
              content: [{
                type: "text",
                text: `Call initiated from ${args.from} to ${args.to}`
              }]
            };
          }

          case "get_call_history": {
            const args = request.params.arguments as any;
            const limit = args.limit || 10;
            const types = args.types || ["CALL", "VOICEMAIL", "FAX", "SMS"];

            const historyFilter: any = {
              limit,
              types
            };

            const history = await this.historyModule.fetchAll(historyFilter);
            const responseText = history ? JSON.stringify(history, null, 2) : "No call history available";
            return {
              content: [{
                type: "text",
                text: responseText
              }]
            };
          }

          case "get_user_info": {
            const webuserId = await this.client.getAuthenticatedWebuserId();
            const response = await this.client.get(`/users/${webuserId}`);
            const responseText = JSON.stringify(response, null, 2);
            return {
              content: [{
                type: "text",
                text: responseText
              }]
            };
          }

          case "get_devices": {
            const webuserId = await this.client.getAuthenticatedWebuserId();
            const devices = await this.devicesModule.getDevices(webuserId);
            return {
              content: [{
                type: "text",
                text: devices ? JSON.stringify(devices, null, 2) : "No devices available"
              }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Sipgate API error: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  /**
   * Start the server
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Sipgate API MCP server running on stdio');
  }
}

// Create and run the server
const server = new SipgateApiServer();
server.run().catch(console.error);
