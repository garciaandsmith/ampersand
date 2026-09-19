import { Fragment } from "react";
import { getChatSettings, listProviders, listSkills } from "@/lib/data/providers";
import { SKILL_INSTRUCTIONS_MAX_LENGTH } from "@/lib/types";
import {
  createProviderAction,
  createSkillAction,
  deleteProviderAction,
  deleteSkillAction,
  setChatSettingsAction,
  updateSkillAction,
} from "./actions";
import { ActionForm } from "./ActionForm";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { ProviderModelFields } from "./ProviderModelFields";
import { AvailableModelsExplorer } from "./AvailableModelsExplorer";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Label,
  Select,
  Table,
  Textarea,
  Th,
} from "@/components/ui";
import { tableRowClass } from "@/lib/table";

const INSTRUCTIONS_HINT = `Markdown is fine. Sent to the model with every call, so keep it focused (limit ${SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString("en-US")} characters). The field's own prompt still says what to write; these say how.`;

export default async function SettingsPage() {
  const [providers, skills, chatSettings] = await Promise.all([
    listProviders(),
    listSkills(),
    getChatSettings(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-4 font-sans text-base font-extrabold">AI Providers</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>API key</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-charcoal/50">
                    No providers connected yet.
                  </td>
                </tr>
              ) : (
                providers.map((p, i) => (
                  <tr key={p.id} className={tableRowClass(i)}>
                    <td className="px-4 py-3 font-bold">{p.name}</td>
                    <td className="px-4 py-3">
                      <Badge color={p.type === "anthropic" ? "purple" : "teal"}>
                        {p.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-charcoal/50">
                      ••••••••{"  "}(stored server-side only)
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteProviderAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <Button variant="danger" type="submit" className="px-2 py-1 text-xs">
                          Remove
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          <Card>
            <h3 className="mb-3 font-sans text-sm font-extrabold">
              Connect a provider
            </h3>
            <form action={createProviderAction} className="flex flex-col gap-2">
              <Field>
                <Label>Name</Label>
                <Input name="name" placeholder="e.g. Anthropic — prod" required />
              </Field>
              <Field>
                <Label>Type</Label>
                <Select name="type" defaultValue="anthropic" required>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                </Select>
              </Field>
              <Field>
                <Label>API key</Label>
                <Input name="apiKey" type="password" placeholder="sk-..." required />
              </Field>
              <Button type="submit" className="self-start">
                Save provider
              </Button>
            </form>
          </Card>
        </div>

        <div className="mt-6">
          <AvailableModelsExplorer providers={providers} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-sans text-base font-extrabold">Skills</h2>
        <p className="mb-4 max-w-2xl text-sm text-charcoal/60">
          A skill is a named recipe: a provider and model, plus an optional effort level,
          output-token limit and standing instructions. Users pick a skill by name in the
          Form Builder — the recipe behind it lives here. Leave effort or tokens on the
          default to use the model&rsquo;s own behavior.
        </p>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Provider</Th>
              <Th>Model</Th>
              <Th>Effort</Th>
              <Th>Max output tokens</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {skills.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-charcoal/50">
                  No skills yet.
                </td>
              </tr>
            ) : (
              skills.map((skill, i) => {
                const formId = `skill-form-${skill.id}`;
                return (
                  <Fragment key={skill.id}>
                  <tr className={i % 2 === 1 ? "bg-charcoal/[0.02]" : ""}>
                    <td className="px-4 py-3">
                      <Input
                        form={formId}
                        name="name"
                        defaultValue={skill.name}
                        required
                        className="min-w-[160px]"
                      />
                    </td>
                    <ProviderModelFields
                      // Remount after each save: React resets a form after its action runs and would
                      // otherwise put these dropdowns back to their first-loaded values.
                      key={`${skill.id}:${skill.updated_at}`}
                      formId={formId}
                      providers={providers}
                      initialProviderId={skill.provider_id}
                      initialModel={skill.model}
                      layout="table"
                      tuning={{ effort: skill.effort, maxOutputTokens: skill.max_output_tokens }}
                    />
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button form={formId} type="submit" variant="ghost" className="px-3 py-1 text-xs">
                          Save
                        </Button>
                        <ConfirmDeleteButton
                          action={deleteSkillAction}
                          id={skill.id}
                          confirmMessage={`Delete the skill "${skill.name}"? Fields that use it will need another skill.`}
                          className="px-3 py-1 text-xs"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr className={tableRowClass(i)}>
                    <td colSpan={6} className="px-4 pb-3">
                      <details>
                        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-charcoal/60">
                          Instructions
                          {skill.instructions
                            ? ` — ${skill.instructions.length.toLocaleString("en-US")} characters`
                            : " — none"}
                        </summary>
                        <Textarea
                          form={formId}
                          name="instructions"
                          defaultValue={skill.instructions ?? ""}
                          rows={8}
                          maxLength={SKILL_INSTRUCTIONS_MAX_LENGTH}
                          placeholder="Standing instructions for this skill, in markdown — e.g. an SEO/GEO writing guide."
                          className="mt-2 font-mono text-xs"
                        />
                        <p className="mt-1 text-xs text-charcoal/50">{INSTRUCTIONS_HINT}</p>
                      </details>
                    </td>
                  </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </Table>
        {skills.map((skill) => (
          <ActionForm key={skill.id} id={`skill-form-${skill.id}`} action={updateSkillAction}>
            <input type="hidden" name="id" value={skill.id} />
          </ActionForm>
        ))}

        <Card className="mt-4 max-w-xl">
          <h3 className="mb-3 font-sans text-sm font-extrabold">Add a skill</h3>
          <ActionForm action={createSkillAction} resetOnSuccess className="flex flex-col gap-2">
            <Field>
              <Label>Name</Label>
              <Input name="name" placeholder="e.g. Caption writer" required />
            </Field>
            <ProviderModelFields
              // New key after each created skill so the form starts blank again.
              key={skills.length}
              providers={providers}
              initialProviderId={null}
              initialModel={null}
              layout="card"
              tuning={{ effort: null, maxOutputTokens: null }}
            />
            <Field>
              <Label>Instructions (optional)</Label>
              <Textarea
                name="instructions"
                rows={6}
                maxLength={SKILL_INSTRUCTIONS_MAX_LENGTH}
                placeholder="Standing instructions for this skill, in markdown — e.g. an SEO/GEO writing guide."
                className="font-mono text-xs"
              />
              <p className="mt-1 text-xs text-charcoal/50">{INSTRUCTIONS_HINT}</p>
            </Field>
            <Button type="submit" className="self-start">
              Create skill
            </Button>
          </ActionForm>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 font-sans text-base font-extrabold">Create chat assistant</h2>
        <p className="mb-4 max-w-2xl text-sm text-charcoal/60">
          The provider and model that power the Create page&rsquo;s grounded Q&amp;A chat.
        </p>
        <Card className="max-w-xl">
          <ActionForm action={setChatSettingsAction} className="flex flex-col gap-2">
            <ProviderModelFields
              key={`${chatSettings.provider_id}:${chatSettings.model}`}
              providers={providers}
              initialProviderId={chatSettings.provider_id}
              initialModel={chatSettings.model}
              layout="card"
            />
            <Button type="submit" className="self-start">
              Save
            </Button>
          </ActionForm>
        </Card>
      </section>
    </div>
  );
}
