import { listProviders, listSkillAssignments } from "@/lib/data/providers";
import { SKILL_LABELS } from "@/lib/types";
import {
  createProviderAction,
  deleteProviderAction,
  setSkillAssignmentAction,
} from "./actions";
import { SkillProviderModelFields } from "./SkillProviderModelFields";
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
  Th,
} from "@/components/ui";
import { tableRowClass } from "@/lib/table";

export default async function SettingsPage() {
  const [providers, skills] = await Promise.all([
    listProviders(),
    listSkillAssignments(),
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
          Each skill is the AI capability behind one place in the product. Assign it a
          provider and a model — the model list is filtered to models that actually
          support the skill.
        </p>
        <Table>
          <thead>
            <tr>
              <Th>Skill</Th>
              <Th>Provider</Th>
              <Th>Model</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {skills.map((skill, i) => {
              const formId = `skill-form-${skill.skill_key}`;
              return (
                <tr key={skill.skill_key} className={tableRowClass(i)}>
                  <td className="px-4 py-3 font-bold">
                    {SKILL_LABELS[skill.skill_key] ?? skill.skill_key}
                  </td>
                  <SkillProviderModelFields formId={formId} providers={providers} skill={skill} />
                  <td className="px-4 py-3 text-right">
                    <Button
                      form={formId}
                      type="submit"
                      variant="ghost"
                      className="px-3 py-1 text-xs"
                    >
                      Save
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {skills.map((skill) => (
          <form
            key={skill.skill_key}
            id={`skill-form-${skill.skill_key}`}
            action={setSkillAssignmentAction}
          >
            <input type="hidden" name="skillKey" value={skill.skill_key} />
          </form>
        ))}
      </section>
    </div>
  );
}
