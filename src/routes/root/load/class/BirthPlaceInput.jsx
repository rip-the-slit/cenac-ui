import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

import { getPlaces } from "../../../../db";
import { FormField } from "../../../../components/Layout";
import FieldInput from "../../../../components/FieldInput";
import Suggestions from "./Suggestions";

const PLACES_ENDPOINT = "/api/periods/places";

function splitPlaceValue(value) {
  return String(value ?? "")
  .split(",")
  .map(normalizePlaceName);
}

function normalizePlaceName(value) {
  return String(value ?? "").trim();
}

export async function placesLoader({ request }) {
  const filters = Object.fromEntries(new URL(request.url).searchParams);
  const data = await getPlaces(filters, { signal: request.signal });
  return { ...data, filters };
}

function PlaceSelect({
  label,
  value,
  disabled,
  required,
  placeholder,
  validationMessages,
  validationKey,
  search,
  onSelect,
  onSearching,
}) {
  const anchorRef = useRef(null);
  const listId = useId();
  const [query, setQuery] = useState(null);
  const [open, setOpen] = useState(false);

  function startSearching() {
    setOpen(true);
    onSearching(search.type);
  }

  function handleChange(event) {
    setQuery(event.target.value);
    startSearching();
  }

  function closeSuggestions() {
    setOpen(false);
    setQuery(null);
    onSearching(null);
  }

  function handleKeyDown(event) {
    if (open && event.key === "Enter") {
      event.preventDefault();
    }
  }

  function clearSelection() {
    closeSuggestions();
    onSelect(null);
  }

  return (
    <div ref={anchorRef} className="relative">
      <FormField label={label}>
        <FieldInput
          validationKey={`${validationKey ?? ""}:${value}`}
          aria-label={label}
          validationMessages={validationMessages}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          className="w-full pr-8"
          value={query ?? value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={startSearching}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </FormField>
      {!disabled && value && (
        <button
          type="button"
          aria-label={`Borrar ${label.toLowerCase()}`}
          className="absolute bottom-2 right-2 rounded p-1 text-gray-500 hover:bg-gray-100"
          onClick={clearSelection}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
      {!disabled && open && (
        <Suggestions
          anchorRef={anchorRef}
          endpoint={PLACES_ENDPOINT}
          label={`Sugerencias de ${label.toLowerCase()}`}
          listId={listId}
          query={query ?? value}
          queryParam="q"
          queryParams={search}
          idAttribute={search.type === "country" ? "iso2" : "id"}
          displayAttribute="name"
          normalizeQuery={normalizePlaceName}
          isQueryValid={() => (true)}
          autoSelectExactMatch={false}
          onSelect={onSelect}
          onClose={closeSuggestions}
        />
      )}
    </div>
  );
}

export default function BirthPlaceInput({
  value = "",
  disabled = false,
  required = true,
  label = "Lugar de nacimiento",
  placeholder = "Venezuela, Guárico, Municipio Leonardo Infante",
  className = "",
  validationMessages,
  validationKey,
  onChange,
  onError,
}) {
  const [country = "", state = "", municipality = ""] = splitPlaceValue(value)
  const [countryPLaceholder = "", statePlaceholder = "", municipalityPLaceholder = ""] = splitPlaceValue(placeholder)
  const [resolved, setResolved] = useState(null);
  const [searching, setSearching] = useState(null);
  const countryRecord =
    resolved?.country?.name === country ? resolved.country : null;
  const stateRecord =
    countryRecord && resolved?.state?.name === state ? resolved.state : null;

  useEffect(() => {
    if (
      disabled || !country ||
      (resolved?.countryName === country && resolved?.stateName === state)
    ) return;
    const controller = new AbortController();

    async function resolveParents() {
      const options = { signal: controller.signal };
      let selectedCountry = countryRecord;
      if (!selectedCountry) {
        const data = await getPlaces({ type: "country", q: country }, options);
        selectedCountry = data.rows.find((place) => place.name === country);
      }
      let selectedState = stateRecord;
      if (selectedCountry && state && !selectedState) {
        const data = await getPlaces(
          { type: "state", country: selectedCountry.iso2, q: state },
          options
        );
        selectedState = data.rows.find((place) => place.name === state);
      }
      if (!controller.signal.aborted) {
        setResolved({
          countryName: country,
          stateName: state,
          country: selectedCountry,
          state: selectedState,
        });
      }
    }

    resolveParents().catch((error) => {
      if (!controller.signal.aborted) onError?.(error.message);
    });
    return () => controller.abort();
  }, [country, countryRecord, disabled, onError, resolved, state, stateRecord]);

  function selectCountry(place) {
    setSearching(null);
    const name = place?.name ?? "";
    setResolved((current) => ({
      ...current,
      countryName: name,
      country: place,
      ...(name !== country ? { stateName: "", state: null } : {}),
    }));
    if (name !== country) onChange(name);
  }

  function selectState(place) {
    setSearching(null);
    const name = place?.name ?? "";
    setResolved({ countryName: country, stateName: name, country: countryRecord, state: place });
    if (name !== state) onChange([country, name].filter(Boolean).join(", "));
  }

  function selectMunicipality(place) {
    setSearching(null);
    onChange([country, state, place?.name].filter(Boolean).join(", "));
  }

  return (
    <fieldset
      disabled={disabled}
      className={`rounded-lg border border-gray-300 p-3 ${className}`}
    >
      <legend className="px-1 text-sm font-medium text-gray-700">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <PlaceSelect
          validationMessages={validationMessages}
          validationKey={validationKey}
          label="País"
          value={country}
          disabled={disabled}
          required={required}
          placeholder={countryPLaceholder}
          search={{ type: "country" }}
          onSelect={selectCountry}
          onSearching={setSearching}
        />
        <PlaceSelect
          validationMessages={validationMessages}
          validationKey={validationKey}
          key={`state:${country}`}
          label="Estado"
          value={state}
          disabled={disabled || !countryRecord || searching === "country"}
          required={required}
          placeholder={statePlaceholder}
          search={{ type: "state", country: countryRecord?.iso2 ?? "" }}
          onSelect={selectState}
          onSearching={setSearching}
        />
        <PlaceSelect
          validationMessages={validationMessages}
          validationKey={validationKey}
          key={`municipality:${country}:${state}`}
          label="Municipio"
          value={municipality}
          disabled={
            disabled || !stateRecord ||
            searching === "country" || searching === "state"
          }
          required={required}
          placeholder={municipalityPLaceholder}
          search={{
            type: "municipality",
            country: countryRecord?.iso2 ?? "",
            state: String(stateRecord?.id ?? ""),
          }}
          onSelect={selectMunicipality}
          onSearching={setSearching}
        />
      </div>
    </fieldset>
  );
}
