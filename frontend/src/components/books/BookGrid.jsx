import BookCard from './BookCard';

export default function BookGrid({ books, badge, showReason, renderFooter }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7">
      {books.map((book) => (
        <BookCard key={book.id} book={book} badge={typeof badge === 'function' ? badge(book) : badge} showReason={showReason} footer={renderFooter?.(book)} />
      ))}
    </div>
  );
}
