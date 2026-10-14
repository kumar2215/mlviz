export async function postJson<T>(url: string, body: object): Promise<T> {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
        const detail: unknown = result?.detail;
        const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map(item => typeof item?.msg === "string" ? item.msg : "Invalid input").join("; ") : `Request failed (${response.status})`;
        throw new Error(message);
    }
    return result as T;
}
