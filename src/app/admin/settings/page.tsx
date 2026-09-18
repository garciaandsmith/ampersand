import { listProviders, listTaskAssignments } from "@/lib/data/providers";
import { TASK_LABELS } from "@/lib/types";
import {
  createProviderAction,
  deleteProviderAction,
  setTaskAssignmentAction,
} from "./actions";
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
  const [providers, tasks] = await Promise.all([
    listProviders(),
    listTaskAssignments(),
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
      </section>

      <section>
        <h2 className="mb-4 font-sans text-base font-extrabold">Tasks</h2>
        <Table>
          <thead>
            <tr>
              <Th>Task</Th>
              <Th>Provider</Th>
              <Th>Model</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => {
              const formId = `task-form-${task.task_key}`;
              return (
                <tr key={task.task_key} className={tableRowClass(i)}>
                  <td className="px-4 py-3 font-bold">
                    {TASK_LABELS[task.task_key] ?? task.task_key}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      form={formId}
                      name="providerId"
                      defaultValue={task.provider_id ?? ""}
                      className="min-w-[160px]"
                    >
                      <option value="">— none —</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.type})
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      form={formId}
                      name="model"
                      defaultValue={task.model ?? ""}
                      placeholder="e.g. claude-sonnet-5"
                      className="min-w-[160px]"
                    />
                  </td>
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
        {tasks.map((task) => (
          <form
            key={task.task_key}
            id={`task-form-${task.task_key}`}
            action={setTaskAssignmentAction}
          >
            <input type="hidden" name="taskKey" value={task.task_key} />
          </form>
        ))}
      </section>
    </div>
  );
}
