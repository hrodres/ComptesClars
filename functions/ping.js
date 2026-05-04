export async function onRequestGet() {
    return new Response('ok');
}

export async function onRequestPost({ env }) {
    const hasKV = env && env.SHARE_KV ? 'kv-ok' : 'kv-missing';
    return new Response(hasKV);
}
