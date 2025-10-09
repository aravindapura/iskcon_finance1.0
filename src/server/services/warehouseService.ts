import { Prisma, PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Инвентарь
export async function getAllInventory() {
  return prisma.inventory.findMany();
}
export async function createInventory(data: Prisma.InventoryCreateInput) {
  return prisma.inventory.create({ data });
}
export async function updateInventory(id: number, data: Prisma.InventoryUpdateInput) {
  return prisma.inventory.update({ where: { id }, data });
}
export async function deleteInventory(id: number) {
  return prisma.inventory.delete({ where: { id } });
}

// Книги
export async function getAllBooks() {
  return prisma.book.findMany();
}
export async function createBook(data: Prisma.BookCreateInput) {
  return prisma.book.create({ data });
}
export async function updateBook(id: number, data: Prisma.BookUpdateInput) {
  return prisma.book.update({ where: { id }, data });
}
export async function deleteBook(id: number) {
  return prisma.book.delete({ where: { id } });
}

// Распространение книги
export async function spreadBook(id: number, count: number) {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw new Error('Книга не найдена');
  if (book.quantity < count) throw new Error('Недостаточно книг');
  return prisma.book.update({
    where: { id },
    data: { quantity: book.quantity - count },
  });
}
