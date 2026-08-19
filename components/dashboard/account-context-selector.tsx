"use client";

import { useState, useTransition } from "react";
import { PencilLine, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export type AssetAccount = {
  id: string;
  name: string;
  subtype: string;
};

type AccountContextSelectorProps = {
  accounts: AssetAccount[];
  destinationPath?: string;
  selectedAccountId: string;
};

type AssetSubtype = "bank" | "cash" | "wallet";

const CREATE_ACCOUNT_VALUE = "__create_account__";

function toAssetSubtype(subtype: string): AssetSubtype {
  if (subtype === "bank" || subtype === "cash" || subtype === "wallet") {
    return subtype;
  }

  return "bank";
}

function getAccountSubtypeLabel(subtype: string) {
  switch (subtype) {
    case "bank":
      return "Banco";
    case "cash":
      return "Efectivo";
    case "wallet":
      return "Billetera";
    default:
      return "Cuenta";
  }
}

export function AccountContextSelector({
  accounts,
  destinationPath = "/protected",
  selectedAccountId,
}: AccountContextSelectorProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [subtype, setSubtype] = useState<AssetSubtype>("bank");
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubtype, setEditSubtype] = useState<AssetSubtype>("bank");
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  const handleSelectAccount = (value: string) => {
    if (value === CREATE_ACCOUNT_VALUE) {
      setIsCreateOpen(true);
      return;
    }

    router.replace(`${destinationPath}?account=${encodeURIComponent(value)}`);
  };

  const handleCreateOpenChange = (open: boolean) => {
    if (isPending) {
      return;
    }

    setIsCreateOpen(open);

    if (!open) {
      setErrorMessage(null);
    }
  };

  const handleEditOpenChange = (open: boolean) => {
    if (isPending) {
      return;
    }

    setIsEditOpen(open);

    if (!open) {
      setEditErrorMessage(null);
    }
  };

  const openEditDialog = () => {
    if (!selectedAccount) {
      return;
    }

    setEditName(selectedAccount.name);
    setEditSubtype(toAssetSubtype(selectedAccount.subtype));
    setEditErrorMessage(null);
    setIsEditOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const parsedAmount = Number(amount);
    const isDuplicateName = accounts.some(
      (account) => account.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );

    if (!normalizedName || amount.trim() === "" || !Number.isFinite(parsedAmount)) {
      setErrorMessage("Completa el nombre y el saldo actual de la cuenta.");
      return;
    }

    if (isDuplicateName) {
      setErrorMessage("Ya tienes una cuenta con ese nombre.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { data, error: createError } = await supabase.rpc(
        "create_asset_account",
        {
          p_name: normalizedName,
          p_subtype: subtype,
        },
      );
      const accountId = data as string | null;

      if (createError || !accountId) {
        setErrorMessage("No se pudo crear la cuenta. Inténtalo de nuevo.");
        return;
      }

      const { error: snapshotError } = await supabase.rpc(
        "record_balance_snapshot",
        {
          p_account_id: accountId,
          p_amount: parsedAmount,
          p_client_request_id: crypto.randomUUID(),
        },
      );

      if (snapshotError) {
        setErrorMessage(
          "La cuenta se creó, pero no se pudo guardar su saldo. Inténtalo de nuevo.",
        );
        router.refresh();
        return;
      }

      setName("");
      setSubtype("bank");
      setAmount("");
      setIsCreateOpen(false);
      router.push(`${destinationPath}?account=${encodeURIComponent(accountId)}`);
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = editName.trim();
    const isDuplicateName = accounts.some(
      (account) =>
        account.id !== selectedAccountId &&
        account.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );

    if (!selectedAccount || !normalizedName) {
      setEditErrorMessage("Completa el nombre de la cuenta.");
      return;
    }

    if (isDuplicateName) {
      setEditErrorMessage("Ya tienes una cuenta con ese nombre.");
      return;
    }

    setEditErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_asset_account", {
        p_account_id: selectedAccount.id,
        p_name: normalizedName,
        p_subtype: editSubtype,
      });

      if (error) {
        setEditErrorMessage("No se pudo actualizar la cuenta. Inténtalo de nuevo.");
        return;
      }

      setIsEditOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-col gap-2 sm:w-72">
        <p className="text-sm font-medium">Cuenta</p>
        <div className="flex gap-2">
          <Select onValueChange={handleSelectAccount} value={selectedAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tus cuentas</SelectLabel>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} · {getAccountSubtypeLabel(account.subtype)}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectItem value={CREATE_ACCOUNT_VALUE}>
                  <Plus />
                  Crear cuenta
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            disabled={!selectedAccount || isPending}
            onClick={openEditDialog}
            type="button"
            variant="outline"
          >
            <PencilLine data-icon="inline-start" />
            Editar
          </Button>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear cuenta</DialogTitle>
            <DialogDescription>
              Registra el saldo que tienes ahora para empezar su proyección.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(errorMessage)}>
                <FieldLabel htmlFor="account-name">Nombre</FieldLabel>
                <Input
                  aria-invalid={Boolean(errorMessage)}
                  autoFocus
                  id="account-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Cuenta BBVA"
                  required
                  value={name}
                />
              </Field>
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  onValueChange={(value) => setSubtype(value as AssetSubtype)}
                  value={subtype}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="bank">Banco</SelectItem>
                      <SelectItem value="wallet">Billetera</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={Boolean(errorMessage)}>
                <FieldLabel htmlFor="opening-balance">Saldo actual</FieldLabel>
                <Input
                  aria-invalid={Boolean(errorMessage)}
                  id="opening-balance"
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                  step="0.01"
                  type="number"
                  value={amount}
                />
                <FieldDescription>
                  Puede ser $0 o un saldo negativo si aplica.
                </FieldDescription>
                <FieldError>{errorMessage}</FieldError>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={isPending} type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button disabled={isPending} type="submit">
                {isPending && <Spinner data-icon="inline-start" />}
                Crear cuenta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
            <DialogDescription>
              Cambia cómo identificas esta cuenta y el tipo con el que se muestra.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-6" onSubmit={handleEditSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(editErrorMessage)}>
                <FieldLabel htmlFor="edit-account-name">Nombre</FieldLabel>
                <Input
                  aria-invalid={Boolean(editErrorMessage)}
                  autoFocus
                  id="edit-account-name"
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Ej. Cuenta BBVA"
                  required
                  value={editName}
                />
              </Field>
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  onValueChange={(value) => setEditSubtype(value as AssetSubtype)}
                  value={editSubtype}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="bank">Banco</SelectItem>
                      <SelectItem value="wallet">Billetera</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError>{editErrorMessage}</FieldError>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={isPending} type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button disabled={isPending} type="submit">
                {isPending && <Spinner data-icon="inline-start" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
