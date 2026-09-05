using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MinGo.Quartz.Platform.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Agents",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Url = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
                    TokenHash = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    AgentVersion = table.Column<string>(type: "TEXT", nullable: true),
                    LastHeartbeat = table.Column<long>(type: "INTEGER", nullable: true),
                    StartedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    RegisteredAt = table.Column<long>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    WarningThresholdSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    OfflineThresholdSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    HeartbeatIntervalSeconds = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Agents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JobDefinitions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    SchedulerName = table.Column<string>(type: "TEXT", nullable: false),
                    JobGroup = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    JobName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    JobType = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    ParamsJson = table.Column<string>(type: "TEXT", nullable: false),
                    OptionsJson = table.Column<string>(type: "TEXT", nullable: false),
                    ScheduleJson = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Error = table.Column<string>(type: "TEXT", nullable: true),
                    TriggersJson = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SchedulerInfos",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    InstanceId = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    IsClustered = table.Column<bool>(type: "INTEGER", nullable: false),
                    JobStoreType = table.Column<string>(type: "TEXT", nullable: true),
                    ThreadPoolType = table.Column<string>(type: "TEXT", nullable: true),
                    ThreadPoolSize = table.Column<int>(type: "INTEGER", nullable: false),
                    RunningSince = table.Column<long>(type: "INTEGER", nullable: true),
                    Version = table.Column<string>(type: "TEXT", nullable: true),
                    NumberOfJobsExecuted = table.Column<int>(type: "INTEGER", nullable: false),
                    JobCountsJson = table.Column<string>(type: "TEXT", nullable: true),
                    FirstReportedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    LastReportedAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchedulerInfos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExecutionLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AgentId = table.Column<string>(type: "TEXT", nullable: false),
                    SchedulerName = table.Column<string>(type: "TEXT", nullable: false),
                    JobGroup = table.Column<string>(type: "TEXT", nullable: false),
                    JobName = table.Column<string>(type: "TEXT", nullable: false),
                    TriggerGroup = table.Column<string>(type: "TEXT", nullable: false),
                    TriggerName = table.Column<string>(type: "TEXT", nullable: false),
                    FireInstanceId = table.Column<string>(type: "TEXT", nullable: true),
                    StartTime = table.Column<long>(type: "INTEGER", nullable: false),
                    EndTime = table.Column<long>(type: "INTEGER", nullable: true),
                    DurationMs = table.Column<long>(type: "INTEGER", nullable: true),
                    Success = table.Column<bool>(type: "INTEGER", nullable: false),
                    ErrorType = table.Column<string>(type: "TEXT", nullable: true),
                    ErrorMessage = table.Column<string>(type: "TEXT", nullable: true),
                    StackTrace = table.Column<string>(type: "TEXT", nullable: true),
                    CustomFieldsJson = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExecutionLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExecutionLogs_Agents_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Agents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AgentSchedulers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    AgentId = table.Column<string>(type: "TEXT", nullable: false),
                    SchedulerName = table.Column<string>(type: "TEXT", nullable: false),
                    SchedulerInstanceId = table.Column<string>(type: "TEXT", nullable: true),
                    ReportedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    SchedulerInfoId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentSchedulers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgentSchedulers_Agents_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Agents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AgentSchedulers_SchedulerInfos_SchedulerInfoId",
                        column: x => x.SchedulerInfoId,
                        principalTable: "SchedulerInfos",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Agents_Name",
                table: "Agents",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_Status",
                table: "Agents",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_TokenHash",
                table: "Agents",
                column: "TokenHash",
                unique: true,
                filter: "TokenHash IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AgentSchedulers_AgentId_SchedulerName",
                table: "AgentSchedulers",
                columns: new[] { "AgentId", "SchedulerName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AgentSchedulers_SchedulerInfoId",
                table: "AgentSchedulers",
                column: "SchedulerInfoId");

            migrationBuilder.CreateIndex(
                name: "IX_AgentSchedulers_SchedulerName",
                table: "AgentSchedulers",
                column: "SchedulerName");

            migrationBuilder.CreateIndex(
                name: "IX_ExecutionLogs_AgentId_StartTime",
                table: "ExecutionLogs",
                columns: new[] { "AgentId", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_ExecutionLogs_JobGroup_JobName_StartTime",
                table: "ExecutionLogs",
                columns: new[] { "JobGroup", "JobName", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_ExecutionLogs_StartTime",
                table: "ExecutionLogs",
                column: "StartTime");

            migrationBuilder.CreateIndex(
                name: "IX_JobDefinitions_SchedulerName_JobGroup_JobName",
                table: "JobDefinitions",
                columns: new[] { "SchedulerName", "JobGroup", "JobName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobDefinitions_Status",
                table: "JobDefinitions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SchedulerInfos_Name",
                table: "SchedulerInfos",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgentSchedulers");

            migrationBuilder.DropTable(
                name: "ExecutionLogs");

            migrationBuilder.DropTable(
                name: "JobDefinitions");

            migrationBuilder.DropTable(
                name: "SchedulerInfos");

            migrationBuilder.DropTable(
                name: "Agents");
        }
    }
}
