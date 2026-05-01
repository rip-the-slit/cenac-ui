import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Clock,
  MessageSquare,
  Users,
  Folder,
  Grid,
  Calendar,
  Globe,
  HelpCircle,
  Settings,
  Search,
  Lightbulb,
  MoreHorizontal,
} from "lucide-react";
import UserSelector from "../login/UserSelector";
import { Outlet, redirect, useLoaderData, useRouteLoaderData } from "react-router";
import { getPeriodList, getPeriodStats } from "../../db";
import { PeriodSelector } from "./PeriodSelector";

export async function appLoader({params, request}) {
  const periodList = await getPeriodList();
  const periodId = params.periodId === "actual" ? periodList[0] : params.periodId;
  const periodData = await getPeriodStats(periodId);

  const url = new URL(request.url);
  if (periodData.stats === null && !url.pathname.includes("cargar")) 
    return redirect(`/periodo/${periodId}/cargar`);

  return {list: periodList, data: periodData, periodId: periodId}
}

const SidebarItem = ({ icon: Icon, label, active }) => (
  <button
    className={`flex items-center w-full px-4 py-2 mt-1 text-sm rounded-lg transition-colors ${
      active
        ? "bg-gray-100 text-gray-900 font-medium"
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
    }`}
  >
    <Icon
      className={`w-5 h-5 mr-3 ${active ? "text-gray-900" : "text-gray-400"}`}
    />
    {label}
  </button>
);

const SidebarSection = ({ title, items }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between px-4 mb-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {title}
      </h3>
      <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
    </div>
    <div className="space-y-1">
      {items.map((item, index) => (
        <SidebarItem
          key={index}
          icon={item.icon}
          label={item.label}
          active={item.active}
        />
      ))}
    </div>
  </div>
);

export default function App() {
  const authData = useRouteLoaderData("auth");
  const period = useLoaderData();

  const isAllDataLoaded = period.data.stats !== null;
  const users = authData.users;

  const generalItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: BookOpen, label: "Courses" },
    { icon: BarChart2, label: "Analytics" },
    { icon: Clock, label: "Time Tracker" },
  ];

  const collaborationItems = [
    { icon: MessageSquare, label: "Messages" },
    { icon: Users, label: "Discussion" },
    { icon: Folder, label: "Resources" },
  ];

  const supportItems = [
    { icon: Grid, label: "Module" },
    { icon: Calendar, label: "Calendar" },
    { icon: Globe, label: "Community" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* User Profile */}
        <UserSelector
          users={users}
          userId={users.findIndex((u) => u.id === authData.activeUser)}
          setUserId={() => {}}
        />
        {/* Navigation */}
        <div className={"flex-1 overflow-y-auto py-6 px-3" + (!isAllDataLoaded ? " pointer-events-none opacity-50" : "")}>
          <SidebarSection title="General" items={generalItems} />
          <SidebarSection title="Collaboration" items={collaborationItems} />
          <SidebarSection title="Support" items={supportItems} />
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <HelpCircle className="w-5 h-5 mr-3 text-gray-400" />
            Help Center
          </button>
          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <Settings className="w-5 h-5 mr-3 text-gray-400" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          {/* Search */}
          <div className="flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="What are you working on..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-400 text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                  /
                </span>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <PeriodSelector list={period.list} currentId={period.periodId} />
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <Lightbulb className="w-4 h-4" />
            </button>
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Content Area */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet/>
        </div>
      </main>
    </div>
  );
}
