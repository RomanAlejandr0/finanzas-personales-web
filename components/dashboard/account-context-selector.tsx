"use client";

import { useState, useTransition } from "react";
import { CreditCard, Landmark, PencilLine, Plus } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createClient } from "@/lib/supabase/client";

export type FinancialAccount = {
  id: string;
  name: string;
  type: "asset" | "liability";
  subtype: string;
  properties: Record<string, unknown>;
};

export type AssetAccount = FinancialAccount & { type: "asset" };

type AccountContextSelectorProps = {
  accounts: FinancialAccount[];
  destinationPath?: string;
  selectedAccountId: string;
};

type AssetSubtype = "bank" | "cash" | "wallet";
type AccountKind = "asset" | "credit_card";

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
    case "credit_card":
      return "Tarjeta de crédito";
    default:
      return "Cuenta";
  }
}

function getCreditLimit(account: FinancialAccount) {
  const creditLimit = account.properties.credit_limit;

  return typeof creditLimit === "number" || typeof creditLimit === "string"
    ? Number(creditLimit)
    : 0;
}

export function AccountContextSelector({
  accounts,
  destinationPath = "/protected",
  selectedAccountId,
}: AccountContextSelectorProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [accountKind, setAccountKind] = useState<AccountKind>("asset");
  const [name, setName] = useState("");
  const [subtype, setSubtype] = useState<AssetSubtype>("bank");
  const [amount, setAmount] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [availableCredit, setAvailableCredit] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubtype, setEditSubtype] = useState<AssetSubtype>("bank");
  const [editCreditLimit, setEditCreditLimit] = useState("");
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const assetAccounts = accounts.filter((account) => account.type === "asset");
  const creditCards = accounts.filter(
    (account) => account.type === "liability" && account.subtype === "credit_card",
  );
  const isSelectedCreditCard =
    selectedAccount?.type === "liability" && selectedAccount.subtype === "credit_card";
  const previewCreditLimit = Number(creditLimit);
  const previewAvailableCredit = Number(availableCredit);
  const hasCreditPreview =
    Number.isFinite(previewCreditLimit) && Number.isFinite(previewAvailableCredit);

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

  const handleAccountKindChange = (value: string) => {
    if (value !== "asset" && value !== "credit_card") {
      return;
    }

    setAccountKind(value);
    setAmount("");
    setAvailableCredit("");
    setErrorMessage(null);
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
    setEditCreditLimit(isSelectedCreditCard ? String(getCreditLimit(selectedAccount)) : "");
    setEditErrorMessage(null);
    setIsEditOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const parsedAmount = Number(amount);
    const parsedCreditLimit = Number(creditLimit);
    const parsedAvailableCredit = Number(availableCredit);
    const isDuplicateName = accounts.some(
      (account) => account.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );

    if (
      !normalizedName ||
      (accountKind === "asset" && (amount.trim() === "" || !Number.isFinite(parsedAmount)))
    ) {
      setErrorMessage(
        accountKind === "asset"
          ? "Completa el nombre y el saldo actual de la cuenta."
          : "Completa el nombre de la tarjeta.",
      );
      return;
    }

    if (
      accountKind === "credit_card" &&
      (creditLimit.trim() === "" || !Number.isFinite(parsedCreditLimit) || parsedCreditLimit <= 0)
    ) {
      setErrorMessage("Ingresa un límite de crédito mayor a $0.");
      return;
    }

    if (
      accountKind === "credit_card" &&
      (availableCredit.trim() === "" ||
        !Number.isFinite(parsedAvailableCredit) ||
        parsedAvailableCredit < 0 ||
        parsedAvailableCredit > parsedCreditLimit)
    ) {
      setErrorMessage("El crédito disponible debe estar entre $0 y tu límite de crédito.");
      return;
    }

    if (isDuplicateName) {
      setErrorMessage("Ya tienes una cuenta con ese nombre.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { data, error: createError } =
        accountKind === "asset"
          ? await supabase.rpc("create_asset_account", {
              p_name: normalizedName,
              p_subtype: subtype,
            })
          : await supabase.rpc("create_credit_card_account", {
              p_name: normalizedName,
              p_credit_limit: parsedCreditLimit,
            });
      const accountId = data as string | null;

      if (createError || !accountId) {
        setErrorMessage(
          accountKind === "asset"
            ? "No se pudo crear la cuenta. Inténtalo de nuevo."
            : "No se pudo crear la tarjeta. Revisa que no exista otra con ese nombre.",
        );
        return;
      }

      const { error: snapshotError } =
        accountKind === "asset"
          ? await supabase.rpc("record_balance_snapshot", {
              p_account_id: accountId,
              p_amount: parsedAmount,
              p_client_request_id: crypto.randomUUID(),
            })
          : await supabase.rpc("record_credit_card_balance_snapshot", {
              p_account_id: accountId,
              p_amount: parsedCreditLimit - parsedAvailableCredit,
              p_client_request_id: crypto.randomUUID(),
            });

      if (snapshotError) {
        setErrorMessage(
          accountKind === "asset"
            ? "La cuenta se creó, pero no se pudo guardar su saldo. Inténtalo de nuevo."
            : "La tarjeta se creó, pero no se pudo guardar su deuda actual. Inténtalo de nuevo.",
        );
        router.refresh();
        return;
      }

      setName("");
      setSubtype("bank");
      setAmount("");
      setCreditLimit("");
      setAvailableCredit("");
      setAccountKind("asset");
      setIsCreateOpen(false);

      if (accountKind === "asset") {
        router.push(`${destinationPath}?account=${encodeURIComponent(accountId)}`);
        return;
      }

      router.refresh();
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = editName.trim();
    const parsedCreditLimit = Number(editCreditLimit);
    const isDuplicateName = accounts.some(
      (account) =>
        account.id !== selectedAccountId &&
        account.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );

    if (!selectedAccount || !normalizedName) {
      setEditErrorMessage(isSelectedCreditCard ? "Completa el nombre de la tarjeta." : "Completa el nombre de la cuenta.");
      return;
    }

    if (
      isSelectedCreditCard &&
      (editCreditLimit.trim() === "" || !Number.isFinite(parsedCreditLimit) || parsedCreditLimit <= 0)
    ) {
      setEditErrorMessage("Ingresa un límite de crédito mayor a $0.");
      return;
    }

    if (isDuplicateName) {
      setEditErrorMessage("Ya tienes una cuenta con ese nombre.");
      return;
    }

    setEditErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = isSelectedCreditCard
        ? await supabase.rpc("update_credit_card_account", {
            p_account_id: selectedAccount.id,
            p_name: normalizedName,
            p_credit_limit: parsedCreditLimit,
          })
        : await supabase.rpc("update_asset_account", {
            p_account_id: selectedAccount.id,
            p_name: normalizedName,
            p_subtype: editSubtype,
          });

      if (error) {
        setEditErrorMessage(
          isSelectedCreditCard
            ? "No se pudo actualizar la tarjeta. Inténtalo de nuevo."
            : "No se pudo actualizar la cuenta. Inténtalo de nuevo.",
        );
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
                <SelectLabel>Cuentas de dinero</SelectLabel>
                {assetAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} · {getAccountSubtypeLabel(account.subtype)}
                  </SelectItem>
                ))}
              </SelectGroup>
              {creditCards.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Tarjetas de crédito</SelectLabel>
                  {creditCards.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} · {getAccountSubtypeLabel(account.subtype)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
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
            <DialogTitle>
              {accountKind === "asset" ? "Crear cuenta" : "Agregar tarjeta de crédito"}
            </DialogTitle>
            <DialogDescription>
              {accountKind === "asset"
                ? "Registra el saldo que tienes ahora para empezar su proyección."
                    : "Registra el límite y el crédito disponible que ves hoy."}
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel id="account-kind-label">¿Qué quieres agregar?</FieldLabel>
                <ToggleGroup
                  aria-labelledby="account-kind-label"
                  onValueChange={handleAccountKindChange}
                  type="single"
                  value={accountKind}
                  variant="outline"
                >
                  <ToggleGroupItem value="asset">
                    <Landmark />
                    Cuenta de dinero
                  </ToggleGroupItem>
                  <ToggleGroupItem value="credit_card">
                    <CreditCard />
                    Tarjeta de crédito
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field data-invalid={Boolean(errorMessage)}>
                <FieldLabel htmlFor="account-name">Nombre</FieldLabel>
                <Input
                  aria-invalid={Boolean(errorMessage)}
                  autoFocus
                  id="account-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder={accountKind === "asset" ? "Ej. Cuenta BBVA" : "Ej. Nu"}
                  required
                  value={name}
                />
              </Field>
              {accountKind === "asset" ? (
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
              ) : (
                <Field data-invalid={Boolean(errorMessage)}>
                  <FieldLabel htmlFor="credit-limit">Límite de crédito</FieldLabel>
                  <Input
                    aria-invalid={Boolean(errorMessage)}
                    id="credit-limit"
                    inputMode="decimal"
                    onChange={(event) => setCreditLimit(event.target.value)}
                    placeholder="0.00"
                    required
                    step="0.01"
                    type="number"
                    value={creditLimit}
                  />
                  <FieldDescription>
                    El monto total autorizado para esta tarjeta.
                  </FieldDescription>
                </Field>
              )}
              {accountKind === "asset" ? (
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
                  <FieldDescription>Puede ser $0 o un saldo negativo si aplica.</FieldDescription>
                  <FieldError>{errorMessage}</FieldError>
                </Field>
              ) : (
                <Field data-invalid={Boolean(errorMessage)}>
                  <FieldLabel htmlFor="available-credit">Crédito disponible</FieldLabel>
                  <Input
                    aria-invalid={Boolean(errorMessage)}
                    id="available-credit"
                    inputMode="decimal"
                    onChange={(event) => setAvailableCredit(event.target.value)}
                    placeholder="0.00"
                    required
                    step="0.01"
                    type="number"
                    value={availableCredit}
                  />
                  <FieldDescription>
                    La deuda actual calculada es {hasCreditPreview
                      ? `$${(previewCreditLimit - previewAvailableCredit).toFixed(2)}`
                      : "$0.00"}.
                  </FieldDescription>
                  <FieldError>{errorMessage}</FieldError>
                </Field>
              )}
            </FieldGroup>

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={isPending} type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button disabled={isPending} type="submit">
                {isPending && <Spinner data-icon="inline-start" />}
                {accountKind === "asset" ? "Crear cuenta" : "Agregar tarjeta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isSelectedCreditCard ? "Editar tarjeta" : "Editar cuenta"}</DialogTitle>
            <DialogDescription>
              {isSelectedCreditCard
                ? "Cambia cómo identificas esta tarjeta y su límite de crédito."
                : "Cambia cómo identificas esta cuenta y el tipo con el que se muestra."}
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
                  placeholder={isSelectedCreditCard ? "Ej. Nu" : "Ej. Cuenta BBVA"}
                  required
                  value={editName}
                />
              </Field>
              {isSelectedCreditCard ? (
                <Field data-invalid={Boolean(editErrorMessage)}>
                  <FieldLabel htmlFor="edit-credit-limit">Límite de crédito</FieldLabel>
                  <Input
                    aria-invalid={Boolean(editErrorMessage)}
                    id="edit-credit-limit"
                    inputMode="decimal"
                    onChange={(event) => setEditCreditLimit(event.target.value)}
                    placeholder="0.00"
                    required
                    step="0.01"
                    type="number"
                    value={editCreditLimit}
                  />
                  <FieldError>{editErrorMessage}</FieldError>
                </Field>
              ) : (
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
              )}
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
