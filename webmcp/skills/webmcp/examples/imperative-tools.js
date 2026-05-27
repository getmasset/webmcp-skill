/*
  WebMCP imperative example.
  Registering JavaScript tools with navigator.modelContext.
  Every tool is feature-detected so the page works without WebMCP.
*/

if ('modelContext' in navigator) {

  // A read-only tool. It reads state and changes nothing.
  navigator.modelContext.registerTool({
    name: 'get_cart_total',
    description: 'Get the current total of items in the shopping cart.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => {
      const total = readCartTotal();
      return `The cart total is ${total}.`;
    },
  });

  // A tool that changes state. It updates the page so the result is visible.
  navigator.modelContext.registerTool({
    name: 'apply_discount_code',
    description: 'Apply a discount code to the cart.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The discount code, as the user typed it.' },
      },
      required: ['code'],
    },
    execute: ({ code }) => {
      const result = applyDiscount(code);
      if (!result.ok) {
        return `That code did not work: ${result.reason}. Ask the user for a different code.`;
      }
      refreshCartUI();
      return `Applied ${code}. New total: ${result.total}.`;
    },
  });

  // A sensitive tool. It confirms with the user before doing anything.
  navigator.modelContext.registerTool({
    name: 'place_order',
    description: 'Place the order for everything currently in the cart.',
    inputSchema: { type: 'object', properties: {} },
    execute: async (input, client) => {
      await client.requestUserInteraction(async () => {
        // Show your own confirmation UI here and wait for the user's choice.
      });
      const order = await submitOrder();
      refreshCartUI();
      return `Order placed. Confirmation number: ${order.id}.`;
    },
  });

}
