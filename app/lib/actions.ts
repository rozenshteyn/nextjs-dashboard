"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(["pending", "paid"]),
    date: z.string(),
});

const InvoiceParser = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = InvoiceParser.parse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status")
    });

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

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = InvoiceParser.parse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status")
    });

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
            message: "Database error: failed to update an invoice"
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