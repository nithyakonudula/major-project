// Provider adapter: safe stub for classroom/demo use. Replace with an approved email/SMS provider.
module.exports={async send(event,payload){const record={event,payload,queuedAt:new Date().toISOString(),channel:'stub'};console.log('[notification queued]',JSON.stringify(record));return record;}};
