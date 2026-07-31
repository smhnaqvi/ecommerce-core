import { api } from "./client";

const get = () => api.get("/site-settings").then(r => r.data);
const update = (form: FormData) =>
  api.put("/site-settings", form).then(r => r.data);   // multipart, browser sets the header

export default {
    get,
    update
}
