const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ params, env }) {
    const data = await env.SHARE_KV.get(params.id);
    if (!data) {
        return new Response(JSON.stringify({ error: 'Not found or expired' }), {
            status: 404,
            headers: { ...CORS, 'Content-Type': 'application/json' }
        });
    }
    return new Response(data, {
        headers: { ...CORS, 'Content-Type': 'application/json' }
    });
}
