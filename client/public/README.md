# MCP Chatbot Script for Scripty

This is a standalone JavaScript file that can be used with Scripty to embed your MCP (Model Context Protocol) chatbot into any website.

## Features

- 🚀 **Easy Integration**: Single script file that works on any website
- 🎨 **Customizable**: Multiple themes, positions, and styling options
- 💬 **Full Chat Functionality**: Complete chat interface with message history
- ⌨️ **Keyboard Shortcuts**: Ctrl+Shift+C to toggle the chatbot
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔧 **Configurable**: Extensive configuration options

## Quick Start

### 1. Basic Usage

Add this script to your website using Scripty:

```html
<script src="https://your-domain.com/script.js"></script>
```

### 2. Configuration (Optional)

You can customize the chatbot by setting configuration options before the script loads:

```html
<script>
window.mcpChatbotConfig = {
    apiUrl: 'https://your-deployed-app.vercel.app/api/chat',
    theme: 'blue',
    position: 'bottom-right',
    title: 'My Assistant',
    welcomeMessage: 'Hello! How can I help you today?'
};
</script>
<script src="https://your-domain.com/script.js"></script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | string | `'https://your-deployed-app.vercel.app/api/chat'` | Your deployed API endpoint |
| `position` | string | `'bottom-right'` | Position on screen: `'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'` |
| `theme` | string | `'blue'` | Color theme: `'blue'`, `'green'`, `'purple'`, `'dark'` |
| `title` | string | `'MCP Assistant'` | Chat window title |
| `welcomeMessage` | string | `'Hello! I'm your MCP assistant...'` | Initial message from the bot |
| `buttonText` | string | `'💬'` | Text/emoji for the toggle button |
| `zIndex` | number | `2147483647` | CSS z-index for the chatbot |
| `width` | number | `320` | Chat window width in pixels |
| `height` | number | `400` | Chat window height in pixels |
| `llmType` | string | `'claude'` | LLM type: `'claude'` or `'gemini'` |

## Themes

### Blue Theme (Default)
- Primary: #007bff
- Clean, professional look

### Green Theme
- Primary: #28a745
- Fresh, nature-inspired

### Purple Theme
- Primary: #6f42c1
- Modern, creative feel

### Dark Theme
- Primary: #343a40
- Dark mode for low-light environments

## Positions

- `bottom-right`: Bottom right corner (default)
- `bottom-left`: Bottom left corner
- `top-right`: Top right corner
- `top-left`: Top left corner

## API Requirements

Your API endpoint should accept POST requests with the following format:

```json
{
    "message": "User's message",
    "messages": [
        {"role": "user", "content": "Previous user message"},
        {"role": "assistant", "content": "Previous assistant response"}
    ],
    "llmType": "claude"
}
```

And return:

```json
{
    "message": "Assistant's response",
    "toolMessages": []
}
```

## Keyboard Shortcuts

- **Ctrl+Shift+C**: Toggle the chatbot open/closed

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Security Considerations

- The script uses `fetch()` to communicate with your API
- Make sure your API endpoint has proper CORS headers
- Consider implementing rate limiting on your API
- The script automatically prevents multiple instances from loading

## Troubleshooting

### Common Issues

1. **Chatbot not appearing**: Check browser console for errors
2. **API errors**: Verify your `apiUrl` is correct and accessible
3. **CORS issues**: Ensure your API has proper CORS headers
4. **Multiple instances**: The script prevents multiple instances automatically

### Debug Mode

Add this to your configuration to enable debug logging:

```javascript
window.mcpChatbotConfig = {
    debug: true
};
```

## Customization Examples

### Minimal Setup
```html
<script src="https://your-domain.com/script.js"></script>
```

### Custom Theme and Position
```html
<script>
window.mcpChatbotConfig = {
    theme: 'purple',
    position: 'bottom-left',
    title: 'Support Bot'
};
</script>
<script src="https://your-domain.com/script.js"></script>
```

### Full Customization
```html
<script>
window.mcpChatbotConfig = {
    apiUrl: 'https://my-api.com/chat',
    theme: 'dark',
    position: 'top-right',
    title: 'AI Assistant',
    welcomeMessage: 'Hi! I\'m here to help you.',
    buttonText: '🤖',
    width: 400,
    height: 500,
    llmType: 'gemini'
};
</script>
<script src="https://your-domain.com/script.js"></script>
```

## Deployment

1. Deploy your Next.js application to Vercel, Netlify, or similar
2. Update the `apiUrl` in the script to point to your deployed API
3. Host the `script.js` file on a CDN or your domain
4. Use Scripty to embed the script on websites

## License

This script is provided as-is for integration with your MCP chatbot application.
