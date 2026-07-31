import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

type ApiError = { response?: { data?: { message?: string } } };

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };
type SocialLink = { platform: string; href: string };

export default function SiteSettings() {
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => api.siteSettings.get(),
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");

  const [columns, setColumns] = useState<FooterColumn[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [copyrightText, setCopyrightText] = useState("");

  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [accentColor, setAccentColor] = useState("#000000");

  const [error, setError] = useState("");

  useEffect(() => {
    if (existing) {
      setLogoUrl(existing.logoUrl ?? "");
      setColumns(existing.footer?.columns ?? []);
      setSocialLinks(existing.footer?.socialLinks ?? []);
      setCopyrightText(existing.footer?.copyrightText ?? "");
      setPrimaryColor(existing.theme?.primaryColor || "#000000");
      setSecondaryColor(existing.theme?.secondaryColor || "#000000");
      setAccentColor(existing.theme?.accentColor || "#000000");
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: (form: FormData) => api.siteSettings.update(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      setLogoFile(null);
    },
    onError: (err: ApiError) => {
      setError(err?.response?.data?.message ?? "Failed to save site settings");
    },
  });

  function addColumn() {
    setColumns([...columns, { title: "", links: [] }]);
  }

  function removeColumn(index: number) {
    setColumns(columns.filter((_, i) => i !== index));
  }

  function updateColumnTitle(index: number, title: string) {
    setColumns(columns.map((c, i) => (i === index ? { ...c, title } : c)));
  }

  function addColumnLink(colIndex: number) {
    setColumns(
      columns.map((c, i) =>
        i === colIndex ? { ...c, links: [...c.links, { label: "", href: "" }] } : c
      )
    );
  }

  function updateColumnLink(
    colIndex: number,
    linkIndex: number,
    patch: Partial<FooterLink>
  ) {
    setColumns(
      columns.map((c, i) =>
        i === colIndex
          ? {
              ...c,
              links: c.links.map((l, j) =>
                j === linkIndex ? { ...l, ...patch } : l
              ),
            }
          : c
      )
    );
  }

  function removeColumnLink(colIndex: number, linkIndex: number) {
    setColumns(
      columns.map((c, i) =>
        i === colIndex
          ? { ...c, links: c.links.filter((_, j) => j !== linkIndex) }
          : c
      )
    );
  }

  function addSocialLink() {
    setSocialLinks([...socialLinks, { platform: "", href: "" }]);
  }

  function updateSocialLink(index: number, patch: Partial<SocialLink>) {
    setSocialLinks(
      socialLinks.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function removeSocialLink(index: number) {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const form = new FormData();
    if (logoFile) form.append("logo", logoFile);

    form.append(
      "footer",
      JSON.stringify({ columns, socialLinks, copyrightText })
    );
    form.append(
      "theme",
      JSON.stringify({ primaryColor, secondaryColor, accentColor })
    );

    save.mutate(form);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        <section>
          <h2 className="text-lg font-semibold mb-3">Logo</h2>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          {logoUrl && (
            <img src={logoUrl} className="w-24 h-24 object-contain mt-2" />
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Footer Columns</h2>
            <button
              type="button"
              onClick={addColumn}
              className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Add column
            </button>
          </div>
          <div className="space-y-4">
            {columns.map((col, ci) => (
              <div key={ci} className="border border-gray-200 rounded p-4 space-y-2">
                <div className="flex justify-between items-center gap-4">
                  <input
                    placeholder="Column title"
                    value={col.title}
                    onChange={(e) => updateColumnTitle(ci, e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeColumn(ci)}
                    className="text-sm text-red-600 hover:bg-red-50 rounded px-2 py-1"
                  >
                    Remove column
                  </button>
                </div>
                {col.links.map((link, li) => (
                  <div key={li} className="flex gap-2 items-center">
                    <input
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) =>
                        updateColumnLink(ci, li, { label: e.target.value })
                      }
                      className="flex-1 border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      placeholder="URL"
                      value={link.href}
                      onChange={(e) =>
                        updateColumnLink(ci, li, { href: e.target.value })
                      }
                      className="flex-1 border border-gray-300 rounded px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => removeColumnLink(ci, li)}
                      className="text-sm text-red-600 hover:bg-red-50 rounded px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addColumnLink(ci)}
                  className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Add link
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Social Links</h2>
            <button
              type="button"
              onClick={addSocialLink}
              className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Add social link
            </button>
          </div>
          <div className="space-y-2">
            {socialLinks.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="Platform (e.g. Instagram)"
                  value={s.platform}
                  onChange={(e) =>
                    updateSocialLink(i, { platform: e.target.value })
                  }
                  className="flex-1 border border-gray-300 rounded px-3 py-2"
                />
                <input
                  placeholder="URL"
                  value={s.href}
                  onChange={(e) => updateSocialLink(i, { href: e.target.value })}
                  className="flex-1 border border-gray-300 rounded px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => removeSocialLink(i)}
                  className="text-sm text-red-600 hover:bg-red-50 rounded px-2 py-1"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Footer Text</h2>
          <input
            placeholder="Copyright text"
            value={copyrightText}
            onChange={(e) => setCopyrightText(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Theme Colors</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Primary</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Secondary</label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Accent</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={save.isPending}
          className="bg-black text-white rounded px-6 py-2 disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save site settings"}
        </button>
      </form>
    </div>
  );
}
