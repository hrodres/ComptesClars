function generateId(len = 7) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => chars[b % chars.length]).join('');
}

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
    try {
        const body = await request.text();
        JSON.parse(body); // validate JSON
        const id = generateId();
        await env.SHARE_KV.put(id, body, { expirationTtl: 2592000 }); // 30 days
        return new Response(JSON.stringify({ id }), {
            headers: { ...CORS, 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Error' }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' }
        });
    }
}
