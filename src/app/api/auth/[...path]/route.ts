import { auth } from "@/lib/neonAuthServer";

export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
