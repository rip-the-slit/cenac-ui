import favicon from "../../../../public/favicon.png";

export default function Logo({ className }) {
  return (
    <div className={"flex justify-center p-5 " + className}>
      <div
        className=
          "grid grid-cols-3 gap-1 w-48 grow-0 text-gray-600 text-sm/4 items-center"
      >
        <img src={favicon} className="col-span-1" />
        <div className="flex flex-col justify-center col-span-2 p-3">
          <h1 className="">Centralizador Académico JGR</h1>
          <p className="font-bold">-CENAC-</p>
        </div>
      </div>
    </div>
  );
}
