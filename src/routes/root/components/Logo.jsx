export default function Logo({ className }) {
  return (
    <div
      className={
        "grid grid-cols-3 p-5 gap-1 text-gray-500 text-sm/4 items-center" + className
      }
    >
      <div className="logo col-span-1" />
      <div className="flex flex-col justify-center col-span-2 p-3">
        <h1 className="">Centralizador Académico JGR</h1>
        <p className="font-bold">-CENAC-</p>
      </div>
    </div>
  );
}
