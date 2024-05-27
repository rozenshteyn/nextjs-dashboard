"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: "Please select a customer."
    }),
    amount: z.coerce.number().gt(0, { message: "Please enter an amount greater than $0" }),
    status: z.enum(["pending", "paid"], {
        invalid_type_error: "Please select an invoice status."
    }),
    date: z.string(),
});

const InvoiceParser = FormSchema.omit({ id: true, date: true });

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[]
    };
    message?: string | null
}

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = InvoiceParser.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status")
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing fields.  Failed to create an invoice"
        }
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split("T")[0];

    try {
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    }
    catch (error) {
        return {
            message: "Database error: failed to create an invoice"
        }
    }

    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
    const validatedFields = InvoiceParser.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status")
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing fields.  Failed to update the invoice"
        }
    }

    const { customerId, amount, status } = validatedFields.data;

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split("T")[0];

    try {
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}, date = ${date}
            WHERE id = ${id}
        `;
    }
    catch (error) {
        return {
            message: "Database error: failed to update the invoice"
        }
    }

    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
    try {
        await sql`
            DELETE FROM invoices
            WHERE id = ${id}
        `;
    }
    catch (error) {
        return {
            message: "Database error: failed to delete an invoice"
        }
    }

    revalidatePath("/dashboard/invoices");
}